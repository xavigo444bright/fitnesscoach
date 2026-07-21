import { describe, expect, it } from "vitest";
import { FIXTURES, buildSquatPose } from "./fixtures/index.js";
import { countReps, initialRepCounterState, stepRep } from "./repCounter.js";
import type { Pose, RepCycleOutcome } from "./types.js";

const frames = (pose: Pose, n: number) => Array.from({ length: n }, () => pose);

const STAND = buildSquatPose({ kneeDeg: 175, torsoDeg: 175 });
const MID = buildSquatPose({ kneeDeg: 130, torsoDeg: 170 });
const BOTTOM = buildSquatPose({ kneeDeg: 85, torsoDeg: 172 });

const oneCycle = (bottomPose: Pose): Pose[] => [
  ...frames(STAND, 6),
  ...frames(MID, 6),
  ...frames(bottomPose, 6),
  ...frames(MID, 6),
  ...frames(STAND, 6),
];

/** 半蹲：只下到 ~130° 再起来，永不进入 bottom（<100）。 */
const halfCycle = (): Pose[] => [
  ...frames(STAND, 6),
  ...frames(MID, 12),
  ...frames(STAND, 6),
];

describe("VT-P1-005 / FR-052 rep 计数", () => {
  it("FX-SEQ-5REPS → count === 5", () => {
    const seq = FIXTURES["FX-SEQ-5REPS"].sequence!;
    const state = countReps(seq);
    expect(state.count).toBe(5);
  });

  it("半蹲未进 bottom → 不计 rep（FR-052）", () => {
    const seq = [
      ...halfCycle(),
      ...halfCycle(),
      ...halfCycle(),
      ...halfCycle(),
      ...halfCycle(),
    ];
    const state = countReps(seq);
    expect(state.count).toBe(0);
    expect(state.reps.length).toBe(0);
  });

  it("半蹲回站时给出 rejected/shallow（供 UI 提示）", () => {
    let state = initialRepCounterState();
    let saw: RepCycleOutcome | null = null;
    for (const p of halfCycle()) {
      state = stepRep(state, p);
      if (state.lastOutcome) saw = state.lastOutcome;
    }
    expect(state.count).toBe(0);
    expect(saw).toEqual({ type: "rejected", reason: "shallow" });
  });

  it("平行蹲（bottom 膝角 ~85）计入", () => {
    // 3 次标准 + 夹半蹲周期 → 仍只计 3
    const seq = [
      ...oneCycle(BOTTOM),
      ...oneCycle(BOTTOM),
      ...halfCycle(),
      ...oneCycle(BOTTOM),
    ];
    const state = countReps(seq);
    expect(state.count).toBe(3);
  });

  it("只站不蹲 → count 0", () => {
    const state = countReps(frames(STAND, 30));
    expect(state.count).toBe(0);
    expect(state.reps.length).toBe(0);
  });

  it("单次标准深蹲 → count 1", () => {
    const state = countReps(oneCycle(BOTTOM));
    expect(state.count).toBe(1);
    expect(state.reps[0].counted).toBe(true);
  });
});
