import { LandmarkIndex, type Pose } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import { POSE_BONES } from "./bones.js";
import { buildSkeletonScene } from "./buildSkeleton.js";

function poseWithSquatPoints(): Pose {
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

describe("buildSkeletonScene (M3-T1 / VT-P3A-001)", () => {
  it("emits joints and bones for present landmarks", () => {
    const scene = buildSkeletonScene(poseWithSquatPoints());
    expect(scene.joints.length).toBe(8);
    expect(scene.bones.length).toBeGreaterThan(0);
    expect(scene.space).toBe("normalized");
    // 右腿髋-膝-踝应有连线
    expect(
      scene.bones.some(
        (b) =>
          b.from === LandmarkIndex.RightHip &&
          b.to === LandmarkIndex.RightKnee,
      ),
    ).toBe(true);
  });

  it("maps to pixel space when size given", () => {
    const scene = buildSkeletonScene(poseWithSquatPoints(), {
      width: 200,
      height: 400,
    });
    expect(scene.space).toBe("pixel");
    const knee = scene.joints.find((j) => j.index === LandmarkIndex.LeftKnee);
    expect(knee?.x).toBeCloseTo(80);
    expect(knee?.y).toBeCloseTo(300);
  });

  it("skips bones when endpoint missing", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.5 };
    const scene = buildSkeletonScene(pose);
    expect(scene.bones).toHaveLength(0);
    expect(POSE_BONES.length).toBeGreaterThan(0);
  });
});
