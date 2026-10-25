import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
} from "../_shared/run-id.ts";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const operativeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "faction", "apl", "move", "save", "wounds", "weapons", "abilities"],
  properties: {
    name: { type: "string", description: "Operative name, e.g. 'Pathfinder Gunner'" },
    faction: { type: "string", enum: ["Tau", "Kroot", "Other"] },
    apl: { type: "number", description: "APL stat" },
    move: { type: "number", description: "Move in inches (number only, e.g. 6 for 6\")" },
    save: { type: "number", description: "Save value, e.g. 5 for 5+" },
    wounds: { type: "number", description: "Wounds stat" },
    weapons: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "melee", "attacks", "hit", "normalDmg", "critDmg", "rules"],
        properties: {
          name: { type: "string" },
          melee: { type: "boolean", description: "true for melee weapons (WS), false for ranged (BS)" },
          attacks: { type: "number", description: "A stat" },
          hit: { type: "number", description: "BS/WS value, e.g. 4 for 4+" },
          normalDmg: { type: "number", description: "Normal damage (first D value)" },
          critDmg: { type: "number", description: "Critical damage (second D value)" },
          rules: { type: "string", description: "Weapon rules, comma separated, e.g. 'Lethal 5+, Piercing 1'. Empty string if none." },
        },
      },
    },
    abilities: { type: "string", description: "All abilities and unique actions text, joined. Empty string if none." },
  },
};

const INSTRUCTIONS =
  "You extract Warhammer 40,000 Kill Team operative datacards from photos. " +
  "Read the datacard in the image and return its stats as structured data. " +
  "Stats may be shown as icons or labelled M/APL/SV/W. Convert values like 6\" to the number 6, and 4+ to 4. " +
  "Include every weapon profile with its attacks (A), hit (BS/WS), damage (normal/critical) and special rules. " +
  "If a value is illegible, make your best estimate from context. Never invent weapons that are not on the card.";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "AI is not configured for this app yet." }, 500);
    }

    const { image } = await request.json();
    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return jsonResponse({ error: "Send a datacard photo as an image data URL." }, 400);
    }
    if (image.length > 6_000_000) {
      return jsonResponse({ error: "That photo is too large — try a closer crop of the datacard." }, 400);
    }

    const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));

    const upstream = await runIdFetch.fetch(`${GATEWAY_URL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      signal: request.signal,
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        store: false,
        instructions: INSTRUCTIONS,
        reasoning: { effort: "low", summary: "auto" },
        text: {
          format: {
            type: "json_schema",
            name: "kt_operative",
            strict: true,
            schema: operativeSchema,
          },
        },
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "Extract this Kill Team operative datacard." },
              { type: "input_image", image_url: image },
            ],
          },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      console.error("gateway error", upstream.status, errText.slice(0, 500));
      if (upstream.status === 402 || upstream.status === 403) {
        return jsonResponse({ error: "AI extraction is unavailable right now (credits or access). Try again later." }, upstream.status);
      }
      if (upstream.status === 429) {
        return jsonResponse({ error: "AI is busy right now — wait a moment and try again." }, 429);
      }
      return jsonResponse({ error: "Couldn't extract the datacard. Try a clearer photo." }, 502);
    }

    // Consume the SSE stream and accumulate the structured output text.
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let outputText = "";
    let streamError = "";

    const handleEvent = (raw: string) => {
      const dataLines = raw.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim());
      if (!dataLines.length) return;
      const payload = dataLines.join("\n");
      if (payload === "[DONE]") return;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          outputText += evt.delta;
        } else if (evt.type === "response.failed" || evt.type === "error") {
          streamError = JSON.stringify(evt).slice(0, 500);
        } else if (evt.type === "response.completed" && !outputText) {
          const out = evt.response?.output;
          if (Array.isArray(out)) {
            for (const item of out) {
              if (item?.type === "message" && Array.isArray(item.content)) {
                for (const c of item.content) {
                  if (c?.type === "output_text" && typeof c.text === "string") outputText += c.text;
                }
              }
            }
          }
        }
      } catch { /* ignore partial JSON chunks */ }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        handleEvent(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
      }
    }
    if (buffer.trim()) handleEvent(buffer);

    if (streamError) {
      console.error("stream error:", streamError);
      return jsonResponse({ error: "Couldn't extract the datacard. Try a clearer photo." }, 502);
    }

    let operative: Record<string, unknown> | null = null;
    try {
      operative = outputText ? JSON.parse(outputText) : null;
    } catch {
      operative = null;
    }
    console.log("extracted:", outputText.slice(0, 1500));

    if (!operative || typeof operative.name !== "string" || !operative.name) {
      return jsonResponse({ error: "Couldn't read a datacard in that photo — try a sharper, closer shot." }, 422);
    }

    return jsonResponse({ operative });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed";
    console.error("kt-datacard error:", message);
    return jsonResponse({ error: "Couldn't extract the datacard. Try a clearer photo." }, 500);
  }
});
