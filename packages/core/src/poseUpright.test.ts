import { describe, expect, it } from "vitest";
import { buildRaisePose } from "./fixtures/raise.js";
import { LandmarkIndex } from "./types.js";
import {
  inferPoseUprightTurn,
  invertQuarterTurn,
  poseUprightApplies,
  PoseUprightLatch,
  rotatePoseNormalized,
} from "./poseUpright.js";

describe("poseUpright", () => {
  it("站姿正面已抬正 → 0", () => {
    const pose = buildRaisePose({ abductionDeg: 8 });
    expect(inferPoseUprightTurn(pose)).toBe(0);
    expect(poseUprightApplies("lateral-raise")).toBe(true);
    expect(poseUprightApplies("bench-press")).toBe(false);
    expect(poseUprightApplies("pushup")).toBe(false);
  });

  it("横置后抬正，逆变换还原", () => {
    const pose = buildRaisePose({ abductionDeg: 8 });
    const ls = pose[LandmarkIndex.LeftShoulder]!;
    const side = rotatePoseNormalized(pose, 90);
    const back = rotatePoseNormalized(side, invertQuarterTurn(90));
    expect(back[LandmarkIndex.LeftShoulder]!.x).toBeCloseTo(ls.x, 5);
    expect(back[LandmarkIndex.LeftShoulder]!.y).toBeCloseTo(ls.y, 5);
    const turn = inferPoseUprightTurn(side);
    expect(turn === 90 || turn === 270).toBe(true);
    const upright = rotatePoseNormalized(side, turn);
    expect(inferPoseUprightTurn(upright)).toBe(0);
  });

  it("PoseUprightLatch 需确认帧才切换", () => {
    const latch = new PoseUprightLatch(3);
    expect(latch.update(90)).toBe(0);
    expect(latch.update(90)).toBe(0);
    expect(latch.update(90)).toBe(90);
    expect(latch.update(90)).toBe(90);
  });
});
