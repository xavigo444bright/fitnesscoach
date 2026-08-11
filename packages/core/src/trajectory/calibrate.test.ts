import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUSHUP_PHASE_CONFIG,
  DEFAULT_SQUAT_PHASE_CONFIG,
} from "../phase.js";
import { driveDegStats, proposePhaseThresholds } from "./calibrate.js";
import { getDemoTrajectory } from "./registry.js";

describe("trajectory calibrate (T7-3 / FR-069)", () => {
  it("driveDegStats：深蹲侧面有 stand/bottom 带", () => {
    const traj = getDemoTrajectory("squat", "side");
    const stats = driveDegStats(traj);
    expect(stats.all.count).toBeGreaterThan(10);
    expect(stats.standBand.count).toBeGreaterThan(0);
    expect(stats.bottomBand.count).toBeGreaterThan(0);
    expect(stats.all.min).toBeLessThan(stats.all.max);
    expect(stats.bottomBand.p50).toBeLessThan(stats.standBand.p50);
  });

  it("proposePhaseThresholds：深蹲/俯卧撑提议在合理带内", () => {
    for (const [exerciseId, camera] of [
      ["squat", "side"],
      ["squat", "front"],
      ["pushup", "side"],
    ] as const) {
      const traj = getDemoTrajectory(exerciseId, camera);
      const stats = driveDegStats(traj);
      const prop = proposePhaseThresholds(stats, exerciseId);
      expect(prop.standAboveDeg).toBeGreaterThan(prop.bottomBelowDeg + 20);
      expect(prop.standAboveDeg).toBeGreaterThanOrEqual(145);
      expect(prop.standAboveDeg).toBeLessThanOrEqual(175);
      const floor = exerciseId === "pushup" ? 95 : 85;
      const ceil = exerciseId === "pushup" ? 135 : 120;
      expect(prop.bottomBelowDeg).toBeGreaterThanOrEqual(floor);
      expect(prop.bottomBelowDeg).toBeLessThanOrEqual(ceil);
      expect(prop.notes.length).toBeGreaterThan(0);
      // eslint-disable-next-line no-console
      console.log(
        `[calibrate] ${traj.id}: standAbove ${prop.current.standAboveDeg}→${prop.standAboveDeg} ` +
          `(Δ${prop.deltaStand}) bottomBelow ${prop.current.bottomBelowDeg}→${prop.bottomBelowDeg} ` +
          `(Δ${prop.deltaBottom}) significant=${prop.significant}`,
      );
    }
  });

  it("当前默认阈值可对照", () => {
    expect(DEFAULT_SQUAT_PHASE_CONFIG.standAboveDeg).toBe(160);
    expect(DEFAULT_SQUAT_PHASE_CONFIG.bottomBelowDeg).toBe(100);
    expect(DEFAULT_PUSHUP_PHASE_CONFIG.bottomBelowDeg).toBe(120);
  });
});
