import { createOpenAI } from "npm:@ai-sdk/openai@2";
import { streamText, Output, jsonSchema, type ModelMessage } from "npm:ai@5";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  getLovableAiGatewayResponseHeaders,
} from "../_shared/run-id.ts";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const operativeSchema = jsonSchema({
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
});

const INSTRUCTIONS =
  "You extract Warhammer 40,000 Kill Team operative datacards from photos. " +
  "Read the datacard in the image and return its stats as structured data. " +
  "Stats may be shown as icons or labelled M/APL/SV/W. Convert values like 6\" to the number 6, and 4+ to 4. " +
  "Include every weapon profile with its attacks (A), hit (BS/WS), damage (normal/critical) and special rules. " +
  "If a value is illegible, make your best estimate from context. Never invent weapons that are not on the card.";

function jsonResponse(body: unknown, status = 200, extra?: Headers) {
  const headers = new Headers({ ...corsHeaders, "Content-Type": "application/json" });
  if (extra) extra.forEach((v, k) => headers.set(k, v));
  return new Response(JSON.stringify(body), { status, headers });
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
    const provider = createOpenAI({
      baseURL: GATEWAY_URL,
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const messages: ModelMessage[] = [
      {
        role: "user",
        content: [
          { type: "image", image: new URL(image) },
          { type: "text", text: "Extract this Kill Team operative datacard." },
        ],
      },
    ];

    const result = streamText({
      model: provider.responses(MODEL),
      instructions: INSTRUCTIONS,
      messages,
      abortSignal: request.signal,
      experimental_output: Output.object({ schema: operativeSchema }),
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const operative = await result.experimental_output;
    console.log("extracted:", JSON.stringify(operative)?.slice(0, 2000));
    if (!operative || !operative.name) {
      return jsonResponse({ error: "Couldn't read a datacard in that photo — try a sharper, closer shot." }, 422);
    }

    return jsonResponse(
      { operative },
      200,
      getLovableAiGatewayResponseHeaders(undefined, corsHeaders && new Headers(corsHeaders)),
    );
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode;
    const message = error instanceof Error ? error.message : "Extraction failed";
    if (status === 402 || status === 403) {
      return jsonResponse({ error: "AI extraction is unavailable right now (credits or access). Try again later." }, status);
    }
    console.error("kt-datacard error:", message);
    return jsonResponse({ error: "Couldn't extract the datacard. Try a clearer photo." }, 500);
  }
});
