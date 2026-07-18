import { describe, expect, it } from "vitest";
import { FIXTURES, buildSquatPose } from "./fixtures/index.js";
import { countReps } from "./repCounter.js";
import type { Pose } from "./types.js";

const frames = (pose: Pose, n: number) => Array.from({ length: n }, () => pose);

const STAND = buildSquatPose({ kneeDeg: 175, torsoDeg: 175 });
const MID = buildSquatPose({ kneeDeg: 130, torsoDeg: 170 });
const BOTTOM = buildSquatPose({ kneeDeg: 85, torsoDeg: 172 });
// 进入 bottom（<100）但未达深度（>=90）→ 触发 squat-depth，该 rep 不计入
const SHALLOW = buildSquatPose({ kneeDeg: 95, torsoDeg: 172 });

const oneCycle = (bottomPose: Pose): Pose[] => [
  ...frames(STAND, 6),
  ...frames(MID, 6),
  ...frames(bottomPose, 6),
  ...frames(MID, 6),
  ...frames(STAND, 6),
];

describe("VT-P1-005 rep 计数", () => {
  it("FX-SEQ-5REPS → count === 5", () => {
    const seq = FIXTURES["FX-SEQ-5REPS"].sequence!;
    const state = countReps(seq);
    expect(state.count).toBe(5);
  });

  it("深度不足的一次不计入", () => {
    // 3 次标准 + 1 次半蹲 → count 4，reps 记录 4 条
    const seq = [
      ...oneCycle(BOTTOM),
      ...oneCycle(BOTTOM),
      ...oneCycle(SHALLOW),
      ...oneCycle(BOTTOM),
    ];
    const state = countReps(seq);
    expect(state.reps.length).toBe(4);
    expect(state.count).toBe(3);
    expect(state.reps.filter((r) => !r.counted).length).toBe(1);
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
