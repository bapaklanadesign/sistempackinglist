import { describe, expect, it } from "vitest";
import { SWARM, particleBudget, revealAt, stageAt, travel } from "@/lib/swarm-timeline";

describe("swarm rebuild timeline", () => {
  it("runs the six stages in order", () => {
    expect([0, 1000, 2000, 3100, 4200, 6000].map(stageAt)).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it("reveals each element only after its particles land, before the final stage", () => {
    expect(revealAt("nav")).toBe(2425);
    expect(revealAt("components")).toBeLessThan(SWARM.final);
  });
  it("travel is clamped 0..1", () => {
    expect(travel(0, "hero", 0)).toBe(0);
    expect(travel(9999, "hero", 1)).toBe(1);
  });
  it("uses fewer particles on phones and weak CPUs", () => {
    expect(particleBudget(360, 8)).toBe(2200);
    expect(particleBudget(1440, 8)).toBe(5200);
    expect(particleBudget(1440, 4)).toBe(2860);
  });
});
