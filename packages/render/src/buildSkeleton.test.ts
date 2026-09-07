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

  it("弱可见踝/脚会画出膝–踝与踝–脚尖，关节坐标对齐 Pose", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.LeftKnee] = { x: 0.4, y: 0.72, visibility: 0.9 };
    pose[LandmarkIndex.LeftAnkle] = { x: 0.41, y: 0.88, visibility: 0.3 };
    pose[LandmarkIndex.LeftHeel] = { x: 0.4, y: 0.92, visibility: 0.28 };
    pose[LandmarkIndex.LeftFootIndex] = { x: 0.46, y: 0.9, visibility: 0.26 };
    const scene = buildSkeletonScene(pose);
    const ankle = scene.joints.find((j) => j.index === LandmarkIndex.LeftAnkle);
    const toe = scene.joints.find((j) => j.index === LandmarkIndex.LeftFootIndex);
    expect(ankle).toMatchObject({ index: LandmarkIndex.LeftAnkle, x: 0.41, y: 0.88 });
    expect(toe).toMatchObject({ index: LandmarkIndex.LeftFootIndex, x: 0.46, y: 0.9 });
    expect(
      scene.bones.some(
        (b) =>
          b.from === LandmarkIndex.LeftKnee &&
          b.to === LandmarkIndex.LeftAnkle,
      ),
    ).toBe(true);
    expect(
      scene.bones.some(
        (b) =>
          b.from === LandmarkIndex.LeftAnkle &&
          b.to === LandmarkIndex.LeftFootIndex,
      ),
    ).toBe(true);
    expect(
      scene.bones.some(
        (b) =>
          b.from === LandmarkIndex.LeftAnkle &&
          b.to === LandmarkIndex.LeftHeel,
      ),
    ).toBe(true);
  });

  it("面部只画耳-外眼角-鼻轮廓，不画眼内碎点", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.Nose] = { x: 0.5, y: 0.18, visibility: 1 };
    pose[LandmarkIndex.LeftEyeInner] = { x: 0.46, y: 0.17, visibility: 1 };
    pose[LandmarkIndex.LeftEye] = { x: 0.44, y: 0.17, visibility: 1 };
    pose[LandmarkIndex.LeftEyeOuter] = { x: 0.42, y: 0.17, visibility: 1 };
    pose[LandmarkIndex.RightEyeInner] = { x: 0.54, y: 0.17, visibility: 1 };
    pose[LandmarkIndex.RightEye] = { x: 0.56, y: 0.17, visibility: 1 };
    pose[LandmarkIndex.RightEyeOuter] = { x: 0.58, y: 0.17, visibility: 1 };
    pose[LandmarkIndex.LeftEar] = { x: 0.38, y: 0.2, visibility: 1 };
    pose[LandmarkIndex.RightEar] = { x: 0.62, y: 0.2, visibility: 1 };
    pose[LandmarkIndex.MouthLeft] = { x: 0.47, y: 0.22, visibility: 1 };
    pose[LandmarkIndex.MouthRight] = { x: 0.53, y: 0.22, visibility: 1 };
    const scene = buildSkeletonScene(pose);
    const indexes = scene.joints.map((j) => j.index).sort((a, b) => a - b);
    expect(indexes).toEqual([
      LandmarkIndex.Nose,
      LandmarkIndex.LeftEyeOuter,
      LandmarkIndex.RightEyeOuter,
      LandmarkIndex.LeftEar,
      LandmarkIndex.RightEar,
    ]);
    expect(
      scene.bones.some(
        (b) =>
          b.from === LandmarkIndex.LeftEar &&
          b.to === LandmarkIndex.LeftEyeOuter,
      ),
    ).toBe(true);
    expect(
      scene.bones.some(
        (b) =>
          b.from === LandmarkIndex.Nose &&
          b.to === LandmarkIndex.RightEyeOuter,
      ),
    ).toBe(true);
  });

  it("肘缺失时补肩-腕骨", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.LeftShoulder] = { x: 0.4, y: 0.3, visibility: 1 };
    pose[LandmarkIndex.LeftWrist] = { x: 0.28, y: 0.48, visibility: 1 };
    const scene = buildSkeletonScene(pose);
    expect(
      scene.bones.some(
        (b) =>
          b.from === LandmarkIndex.LeftShoulder &&
          b.to === LandmarkIndex.LeftWrist,
      ),
    ).toBe(true);
  });
});
