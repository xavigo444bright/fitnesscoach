import { LandmarkIndex, type Pose } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import {
  inferSideFacing,
  inferSideFacingDetailed,
  mirrorPoseX,
  orientPoseToFacing,
  SideFacingLatch,
} from "./sideFacing.js";

function sidePose(facing: 1 | -1): Pose {
  const right: Pose = [];
  right[LandmarkIndex.RightHip] = { x: 0.45, y: 0.5 };
  right[LandmarkIndex.LeftHip] = { x: 0.45, y: 0.5 };
  right[LandmarkIndex.RightKnee] = { x: 0.62, y: 0.7 };
  right[LandmarkIndex.LeftKnee] = { x: 0.6, y: 0.7 };
  right[LandmarkIndex.RightAnkle] = { x: 0.5, y: 0.9 };
  right[LandmarkIndex.LeftAnkle] = { x: 0.48, y: 0.9 };
  right[LandmarkIndex.RightShoulder] = { x: 0.55, y: 0.3 };
  right[LandmarkIndex.LeftShoulder] = { x: 0.55, y: 0.3 };
  right[LandmarkIndex.RightWrist] = { x: 0.68, y: 0.45 };
  right[LandmarkIndex.LeftWrist] = { x: 0.66, y: 0.45 };
  return facing === 1 ? right : mirrorPoseX(right, 0.5);
}

/** 站立朝左：髋略在踝前（旧启发式会误判朝右） */
function standFacingLeftTrap(): Pose {
  const p: Pose = [];
  p[LandmarkIndex.LeftHip] = { x: 0.48, y: 0.45 };
  p[LandmarkIndex.RightHip] = { x: 0.48, y: 0.45 };
  p[LandmarkIndex.LeftKnee] = { x: 0.49, y: 0.7 };
  p[LandmarkIndex.RightKnee] = { x: 0.49, y: 0.7 };
  p[LandmarkIndex.LeftAnkle] = { x: 0.52, y: 0.9 };
  p[LandmarkIndex.RightAnkle] = { x: 0.52, y: 0.9 };
  p[LandmarkIndex.LeftShoulder] = { x: 0.48, y: 0.25 };
  p[LandmarkIndex.RightShoulder] = { x: 0.48, y: 0.25 };
  p[LandmarkIndex.LeftWrist] = { x: 0.42, y: 0.4 };
  p[LandmarkIndex.RightWrist] = { x: 0.42, y: 0.4 };
  return p;
}

describe("sideFacing (FR-068)", () => {
  it("inferSideFacing 区分左右", () => {
    expect(inferSideFacing(sidePose(1))).toBe(1);
    expect(inferSideFacing(sidePose(-1))).toBe(-1);
  });

  it("站立间歇：不因踝在髋后误判；手臂前伸可判朝左", () => {
    const p = standFacingLeftTrap();
    // 仅踝–髋会投 +1；手腕在左应主导或至少不锁死朝右
    const inf = inferSideFacingDetailed(p);
    expect(inf.facing).not.toBe(1);
  });

  it("orientPoseToFacing：示范朝向未知时默认朝右，对朝左用户镜像", () => {
    const ambiguous: Pose = [];
    ambiguous[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.5 };
    ambiguous[LandmarkIndex.RightHip] = { x: 0.5, y: 0.5 };
    ambiguous[LandmarkIndex.LeftKnee] = { x: 0.5, y: 0.7 };
    ambiguous[LandmarkIndex.RightKnee] = { x: 0.5, y: 0.7 };
    ambiguous[LandmarkIndex.LeftAnkle] = { x: 0.5, y: 0.9 };
    ambiguous[LandmarkIndex.RightAnkle] = { x: 0.5, y: 0.9 };
    ambiguous[LandmarkIndex.LeftShoulder] = { x: 0.51, y: 0.25 };
    ambiguous[LandmarkIndex.RightShoulder] = { x: 0.51, y: 0.25 };
    expect(inferSideFacing(ambiguous)).toBe(0);

    const oriented = orientPoseToFacing(ambiguous, -1, 0);
    expect(oriented[LandmarkIndex.LeftShoulder]!.x).toBeCloseTo(0.49);
  });

  it("SideFacingLatch：行程禁止翻转，stand 可翻", () => {
    const latch = new SideFacingLatch(4);
    for (let i = 0; i < 3; i += 1) {
      expect(latch.update(1, { confidence: 1, allowFlip: true })).toBe(1);
    }
    expect(latch.value).toBe(1);

    // 行程：反向信号不得翻
    for (let i = 0; i < 8; i += 1) {
      expect(
        latch.update(-1, { confidence: 1, allowFlip: false }),
      ).toBe(1);
    }
    expect(latch.value).toBe(1);

    // 站立转身：连续确认后翻转
    expect(latch.update(-1, { confidence: 1, allowFlip: true })).toBe(1);
    expect(latch.update(-1, { confidence: 1, allowFlip: true })).toBe(1);
    expect(latch.update(-1, { confidence: 1, allowFlip: true })).toBe(1);
    expect(latch.update(-1, { confidence: 1, allowFlip: true })).toBe(-1);
    expect(latch.value).toBe(-1);
  });
});
