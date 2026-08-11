import { describe, expect, it } from "vitest";
import {
  parseDemoTrajectory,
  synthesizeDemoTrajectory,
} from "@fitness-coach/core";

describe("trajectory-extract CLI contract", () => {
  it("synthesize 输出可被 parseDemoTrajectory 接受", () => {
    const traj = synthesizeDemoTrajectory("pushup");
    expect(parseDemoTrajectory(traj).frames.length).toBeGreaterThan(8);
  });
});
