import {
  countReps,
  FIXTURES,
  buildSquatPose,
  buildPushupPose,
  DEFAULT_PLANK_PHASE_CONFIG,
  PLANK_RULES,
  PLANK_DEPTH_RULE_ID,
  plankDriveDeg,
} from "@fitness-coach/core";
import type { Pose } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import { repDisplayFromState } from "./repDisplay.js";

const frames = (pose: Pose, n: number) => Array.from({ length: n }, () => pose);

const STAND = buildSquatPose({ kneeDeg: 175, torsoDeg: 175 });
const MID = buildSquatPose({ kneeDeg: 130, torsoDeg: 170 });

/** 半蹲：永不进入 bottom。 */
const halfCycle = (): Pose[] => [
  ...frames(STAND, 6),
  ...frames(MID, 12),
  ...frames(STAND, 6),
];

describe("VT-P3B-003/004 Rep → UI 数据", () => {
  it("标准 5 蹲 → count 5（FR-051）", () => {
    const state = countReps(FIXTURES["FX-SEQ-5REPS"].sequence!);
    const ui = repDisplayFromState(state);
    expect(ui.count).toBe(5);
    expect(ui.lastCounted).toBe(true);
    expect(ui.holdActive).toBe(false);
  });

  it("5 次半蹲（未进 bottom）→ count 0（FR-052）", () => {
    const seq = [
      ...halfCycle(),
      ...halfCycle(),
      ...halfCycle(),
      ...halfCycle(),
      ...halfCycle(),
    ];
    const state = countReps(seq);
    const ui = repDisplayFromState(state);
    expect(state.reps.length).toBe(0);
    expect(ui.count).toBe(0);
    expect(ui.lastCounted).toBe(null);
    expect(ui.holdActive).toBe(false);
  });

  it("无结算 → lastCounted null", () => {
    const state = countReps(frames(STAND, 10));
    expect(repDisplayFromState(state)).toEqual({
      count: 0,
      lastCounted: null,
      holdActive: false,
    });
  });
});

describe("hold_second HUD（UX-009）", () => {
  const HOLD = buildPushupPose({ elbowDeg: 165, hipDrop: 0 });
  const PIKE = buildPushupPose({ elbowDeg: 165, hipDrop: -0.28 });
  const opts = {
    phaseConfig: DEFAULT_PLANK_PHASE_CONFIG,
    rules: PLANK_RULES,
    angleFn: plankDriveDeg,
    depthRuleId: PLANK_DEPTH_RULE_ID,
    exerciseId: "plank" as const,
    countMode: "hold_second" as const,
  };

  it("撑稳中 holdActive，count 为有效秒汇总", () => {
    const state = countReps(frames(HOLD, 40), opts);
    const ui = repDisplayFromState(state);
    expect(ui.holdActive).toBe(true);
    expect(ui.count).toBeGreaterThanOrEqual(1);
    expect(ui.count).toBe(state.count);
  });

  it("撅臀后中央应停（holdActive false），底栏汇总保留", () => {
    const state = countReps([...frames(HOLD, 40), ...frames(PIKE, 20)], opts);
    const ui = repDisplayFromState(state);
    expect(ui.holdActive).toBe(false);
    expect(ui.count).toBeGreaterThanOrEqual(1);
  });
});
