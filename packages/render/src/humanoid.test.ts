import {
  getDemoTrajectory,
  LandmarkIndex,
  poseFromFrame,
  sampleTrajectoryAt,
  type Pose,
} from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import {
  figureScaleFromHeights,
  humanoidRoleForBoneName,
  humanoidTargetsFromPose,
  normalizeBoneName,
} from "./humanoid.js";

function squatPose(): Pose {
  const pose: Pose = [];
  const pts: Record<number, { x: number; y: number }> = {
    [LandmarkIndex.LeftShoulder]: { x: 0.51, y: 0.28 },
    [LandmarkIndex.RightShoulder]: { x: 0.53, y: 0.28 },
    [LandmarkIndex.LeftElbow]: { x: 0.48, y: 0.4 },
    [LandmarkIndex.RightElbow]: { x: 0.55, y: 0.4 },
    [LandmarkIndex.LeftWrist]: { x: 0.47, y: 0.5 },
    [LandmarkIndex.RightWrist]: { x: 0.56, y: 0.5 },
    [LandmarkIndex.LeftHip]: { x: 0.51, y: 0.52 },
    [LandmarkIndex.RightHip]: { x: 0.53, y: 0.52 },
    [LandmarkIndex.LeftKnee]: { x: 0.5, y: 0.72 },
    [LandmarkIndex.RightKnee]: { x: 0.54, y: 0.72 },
    [LandmarkIndex.LeftAnkle]: { x: 0.5, y: 0.92 },
    [LandmarkIndex.RightAnkle]: { x: 0.54, y: 0.92 },
  };
  for (const [idx, p] of Object.entries(pts)) {
    pose[Number(idx)] = { x: p.x, y: p.y };
  }
  return pose;
}

describe("humanoidTargetsFromPose (T9-2 / OQ-006)", () => {
  it("normalizes Mixamo bone names to roles", () => {
    expect(normalizeBoneName("mixamorig:Hips")).toBe("hips");
    expect(humanoidRoleForBoneName("mixamorig:Hips")).toBe("hips");
    expect(humanoidRoleForBoneName("mixamorig:LeftUpLeg")).toBe("leftUpperLeg");
    expect(humanoidRoleForBoneName("mixamorig:LeftForeArm")).toBe(
      "leftLowerArm",
    );
    expect(humanoidRoleForBoneName("Beta_Surface")).toBeNull();
  });

  it("scales bind height into the ortho camera instead of clamping to 0.08", () => {
    expect(figureScaleFromHeights(0.39, 0.56)).toBeCloseTo(0.39 / 0.56, 5);
    expect(figureScaleFromHeights(0.39, 70)).toBeLessThan(0.01);
    expect(figureScaleFromHeights(0.39, 70)).toBeGreaterThan(0);
  });

  it("places hips between left/right hip and head above hips", () => {
    const t = humanoidTargetsFromPose(squatPose(), { cameraHint: "side" });
    expect(t).not.toBeNull();
    expect(t!.hips.x).toBeCloseTo(0.52, 5);
    expect(t!.hips.y).toBeCloseTo(0.52, 5);
    expect(t!.head.y).toBeLessThan(t!.hips.y);
    expect(t!.leftHip.z).toBeGreaterThan(0);
    expect(t!.rightHip.z).toBeLessThan(0);
  });

  it("fills occluded left-side joints from squat-side trajectory", () => {
    const traj = getDemoTrajectory("squat", "side");
    const pose = poseFromFrame(sampleTrajectoryAt(traj, 0.4));
    const t = humanoidTargetsFromPose(pose, {
      cameraHint: "side",
      exerciseId: "squat",
    });
    expect(t).not.toBeNull();
    expect(t!.leftAnkle.y).toBeGreaterThan(t!.leftKnee.y);
    expect(t!.leftKnee.y).toBeGreaterThan(t!.hips.y);
  });
});
