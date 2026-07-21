import {
  LandmarkIndex,
  type Pose,
  type ValidationResult,
} from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import { buildSkeletonScene } from "./buildSkeleton.js";
import { applyJointColors } from "./colorJoints.js";

function squatPose(): Pose {
  const pose: Pose = [];
  const pts: Record<number, { x: number; y: number }> = {
    [LandmarkIndex.LeftShoulder]: { x: 0.4, y: 0.3 },
    [LandmarkIndex.RightShoulder]: { x: 0.6, y: 0.3 },
    [LandmarkIndex.LeftHip]: { x: 0.42, y: 0.55 },
    [LandmarkIndex.RightHip]: { x: 0.58, y: 0.55 },
    [LandmarkIndex.LeftKnee]: { x: 0.4, y: 0.75 },
    [LandmarkIndex.RightKnee]: { x: 0.6, y: 0.75 },
    [LandmarkIndex.LeftAnkle]: { x: 0.4, y: 0.95 },
    [LandmarkIndex.RightAnkle]: { x: 0.6, y: 0.95 },
  };
  for (const [idx, p] of Object.entries(pts)) {
    pose[Number(idx)] = { ...p, visibility: 1 };
  }
  return pose;
}

describe("applyJointColors (M3-T2 / VT-P3A-002)", () => {
  it("paints left knee chain red on knee-valgus-l", () => {
    const scene = buildSkeletonScene(squatPose());
    const validation: ValidationResult = {
      status: "error",
      messages: ["左膝内扣"],
      results: [
        {
          id: "knee-valgus-l",
          triggered: true,
          severity: "error",
          message: "左膝内扣",
        },
      ],
    };
    const colored = applyJointColors(scene, validation);
    const leftKnee = colored.joints.find(
      (j) => j.index === LandmarkIndex.LeftKnee,
    );
    const rightKnee = colored.joints.find(
      (j) => j.index === LandmarkIndex.RightKnee,
    );
    expect(leftKnee?.status).toBe("error");
    expect(rightKnee?.status).toBe("correct");
    expect(
      colored.bones.find(
        (b) =>
          b.from === LandmarkIndex.LeftHip &&
          b.to === LandmarkIndex.LeftKnee,
      )?.status,
    ).toBe("error");
  });

  it("uses warning for torso-upright", () => {
    const scene = buildSkeletonScene(squatPose());
    const validation: ValidationResult = {
      status: "warning",
      messages: ["躯干前倾"],
      results: [
        {
          id: "torso-upright",
          triggered: true,
          severity: "warning",
          message: "躯干前倾",
        },
      ],
    };
    const colored = applyJointColors(scene, validation);
    expect(
      colored.joints.find((j) => j.index === LandmarkIndex.RightHip)?.status,
    ).toBe("warning");
  });

  it("error wins over warning on same joint", () => {
    const scene = buildSkeletonScene(squatPose());
    const validation: ValidationResult = {
      status: "error",
      messages: [],
      results: [
        {
          id: "torso-upright",
          triggered: true,
          severity: "warning",
          message: "lean",
        },
        {
          id: "squat-depth",
          triggered: true,
          severity: "error",
          message: "depth",
        },
      ],
    };
    const colored = applyJointColors(scene, validation);
    // RightKnee 同时在 torso 与 depth 链上 → error
    expect(
      colored.joints.find((j) => j.index === LandmarkIndex.RightKnee)?.status,
    ).toBe("error");
  });
});
