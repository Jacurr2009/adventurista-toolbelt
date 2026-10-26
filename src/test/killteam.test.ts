import { describe, it, expect } from "vitest";
import { starterTeams, topUpKinband, type KTTeam } from "@/lib/killteam";

const kinband = (teams: KTTeam[]) => teams.find(t => t.id === "farstalker-kinband")!;

describe("Farstalker Kinband roster", () => {
  it("starts with a full 12-operative kill team", () => {
    expect(kinband(starterTeams()).operatives).toHaveLength(12);
  });

  it("tops up a saved 5-operative starter kinband to 12, keeping existing ids", () => {
    const saved = starterTeams().map(t =>
      t.id === "farstalker-kinband" ? { ...t, operatives: t.operatives.slice(0, 5) } : t);
    const before = saved.find(t => t.id === "farstalker-kinband")!.operatives.map(o => o.id);

    const result = kinband(topUpKinband(saved));

    expect(result.operatives).toHaveLength(12);
    expect(result.operatives.slice(0, 5).map(o => o.id)).toEqual(before);
  });

  it("leaves an edited kinband alone", () => {
    const edited = starterTeams().map(t =>
      t.id === "farstalker-kinband"
        ? { ...t, operatives: t.operatives.slice(0, 5).map(o => ({ ...o, wounds: o.wounds + 2 })) }
        : t);

    expect(kinband(topUpKinband(edited)).operatives).toHaveLength(5);
  });

  it("does not grow a kinband that is already at 12", () => {
    const current = starterTeams();

    expect(kinband(topUpKinband(current)).operatives).toHaveLength(12);
  });
});
