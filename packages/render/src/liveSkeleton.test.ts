import { LandmarkIndex, type Pose } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import { keepBoneForNearSide } from "./bones.js";
import { buildSkeletonScene } from "./buildSkeleton.js";
import {
  STRICT_DRAW_VISIBILITY,
  filterPoseForOverlay,
  isWrongCameraPlane,
  liveSkeletonDrawSpec,
} from "./liveSkeleton.js";

function sideBenchPose(): Pose {
  const pose: Pose = [];
  pose[LandmarkIndex.LeftShoulder] = { x: 0.48, y: 0.32, visibility: 0.35 };
  pose[LandmarkIndex.RightShoulder] = { x: 0.5, y: 0.3, visibility: 0.92 };
  pose[LandmarkIndex.LeftElbow] = { x: 0.46, y: 0.22, visibility: 0.28 };
  pose[LandmarkIndex.RightElbow] = { x: 0.58, y: 0.22, visibility: 0.9 };
  pose[LandmarkIndex.LeftWrist] = { x: 0.44, y: 0.12, visibility: 0.22 };
  pose[LandmarkIndex.RightWrist] = { x: 0.66, y: 0.14, visibility: 0.88 };
  pose[LandmarkIndex.LeftHip] = { x: 0.49, y: 0.55, visibility: 0.3 };
  pose[LandmarkIndex.RightHip] = { x: 0.51, y: 0.52, visibility: 0.8 };
  return pose;
}

describe("liveSkeletonDrawSpec", () => {
  it("推荐侧面却判成正面 → 不画现场骨、示范窗不跟人", () => {
    const spec = liveSkeletonDrawSpec({
      requireSidePlane: true,
      observedCamera: "front",
      observedConfidence: 0.7,
      pose: sideBenchPose(),
      strictDrawVisibility: true,
    });
    expect(isWrongCameraPlane({
      requireSidePlane: true,
      observedCamera: "front",
      observedConfidence: 0.7,
    })).toBe(true);
    expect(spec.drawLive).toBe(false);
    expect(spec.followUserInPip).toBe(false);
  });

  it("侧面近景：只留近侧，画骨 vis 加严", () => {
    const pose = sideBenchPose();
    const spec = liveSkeletonDrawSpec({
      requireSidePlane: true,
      observedCamera: "side",
      observedConfidence: 0.8,
      pose,
      strictDrawVisibility: true,
    });
    expect(spec.drawLive).toBe(true);
    expect(spec.nearSide).toBe("right");
    expect(spec.limbPolicy).toBe("near-all");
    expect(spec.minVisibility).toBe(STRICT_DRAW_VISIBILITY);
    const filtered = filterPoseForOverlay(
      pose,
      spec.nearSide,
      spec.minVisibility,
      spec.limbPolicy,
    );
    expect(filtered[LandmarkIndex.RightElbow]).toBeDefined();
    expect(filtered[LandmarkIndex.LeftElbow]).toBeUndefined();
    expect(filtered[LandmarkIndex.LeftWrist]).toBeUndefined();
  });

  it("3/4（hint=0）不按正侧剪一半", () => {
    const spec = liveSkeletonDrawSpec({
      observedCamera: 0,
      observedConfidence: 0.2,
      pose: sideBenchPose(),
      strictDrawVisibility: true,
      exerciseId: "bench-press",
    });
    expect(spec.drawLive).toBe(true);
    expect(spec.nearSide).toBe("both");
    expect(spec.limbPolicy).toBe("all");
  });

  it("卧推侧面：两臂都留，只藏远侧腿", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.LeftShoulder] = { x: 0.48, y: 0.32, visibility: 0.8 };
    pose[LandmarkIndex.RightShoulder] = { x: 0.5, y: 0.3, visibility: 0.92 };
    pose[LandmarkIndex.LeftElbow] = { x: 0.46, y: 0.22, visibility: 0.7 };
    pose[LandmarkIndex.RightElbow] = { x: 0.58, y: 0.22, visibility: 0.9 };
    pose[LandmarkIndex.LeftWrist] = { x: 0.44, y: 0.12, visibility: 0.7 };
    pose[LandmarkIndex.RightWrist] = { x: 0.66, y: 0.14, visibility: 0.88 };
    pose[LandmarkIndex.LeftHip] = { x: 0.49, y: 0.55, visibility: 0.6 };
    pose[LandmarkIndex.RightHip] = { x: 0.51, y: 0.52, visibility: 0.8 };
    pose[LandmarkIndex.LeftKnee] = { x: 0.48, y: 0.72, visibility: 0.5 };
    pose[LandmarkIndex.RightKnee] = { x: 0.52, y: 0.7, visibility: 0.85 };
    const spec = liveSkeletonDrawSpec({
      requireSidePlane: true,
      observedCamera: "side",
      observedConfidence: 0.8,
      pose,
      strictDrawVisibility: true,
      exerciseId: "bench-press",
    });
    expect(spec.limbPolicy).toBe("near-legs");
    expect(spec.nearSide).toBe("right");
    const filtered = filterPoseForOverlay(
      pose,
      spec.nearSide,
      spec.minVisibility,
      spec.limbPolicy,
    );
    expect(filtered[LandmarkIndex.LeftElbow]).toBeDefined();
    expect(filtered[LandmarkIndex.RightElbow]).toBeDefined();
    expect(filtered[LandmarkIndex.LeftKnee]).toBeUndefined();
    expect(filtered[LandmarkIndex.RightKnee]).toBeDefined();
    const scene = buildSkeletonScene(filtered, {
      nearSide: spec.nearSide,
      limbPolicy: spec.limbPolicy,
    });
    expect(
      scene.bones.some(
        (b) =>
          b.from === LandmarkIndex.LeftShoulder &&
          b.to === LandmarkIndex.LeftElbow,
      ),
    ).toBe(true);
    expect(
      scene.bones.some(
        (b) =>
          b.from === LandmarkIndex.LeftHip &&
          b.to === LandmarkIndex.LeftKnee,
      ),
    ).toBe(false);
  });

  it("前平举侧面：分开的两臂都留，叠住或看不清的远侧臂丢掉", () => {
    const raised: Pose = [];
    raised[LandmarkIndex.LeftShoulder] = { x: 0.48, y: 0.32, visibility: 0.7 };
    raised[LandmarkIndex.RightShoulder] = { x: 0.5, y: 0.3, visibility: 0.92 };
    raised[LandmarkIndex.LeftElbow] = { x: 0.28, y: 0.3, visibility: 0.72 };
    raised[LandmarkIndex.RightElbow] = { x: 0.52, y: 0.48, visibility: 0.95 };
    raised[LandmarkIndex.LeftWrist] = { x: 0.12, y: 0.3, visibility: 0.7 };
    raised[LandmarkIndex.RightWrist] = { x: 0.54, y: 0.62, visibility: 0.95 };
    raised[LandmarkIndex.LeftHip] = { x: 0.49, y: 0.55, visibility: 0.5 };
    raised[LandmarkIndex.RightHip] = { x: 0.51, y: 0.52, visibility: 0.85 };
    raised[LandmarkIndex.RightKnee] = { x: 0.52, y: 0.72, visibility: 0.85 };
    const spec = liveSkeletonDrawSpec({
      requireSidePlane: true,
      observedCamera: "side",
      observedConfidence: 0.8,
      pose: raised,
      strictDrawVisibility: true,
      exerciseId: "front-raise",
    });
    expect(spec.limbPolicy).toBe("near-legs");
    const kept = filterPoseForOverlay(
      raised,
      spec.nearSide,
      spec.minVisibility,
      spec.limbPolicy,
    );
    expect(kept[LandmarkIndex.LeftElbow]).toBeDefined();
    expect(kept[LandmarkIndex.LeftWrist]).toBeDefined();
    expect(kept[LandmarkIndex.RightElbow]).toBeDefined();
    expect(kept[LandmarkIndex.RightWrist]).toBeDefined();

    const stacked: Pose = raised.slice();
    stacked[LandmarkIndex.LeftElbow] = { x: 0.52, y: 0.47, visibility: 0.8 };
    stacked[LandmarkIndex.LeftWrist] = { x: 0.55, y: 0.6, visibility: 0.4 };
    const dropped = filterPoseForOverlay(
      stacked,
      "right",
      STRICT_DRAW_VISIBILITY,
      "near-legs",
    );
    expect(dropped[LandmarkIndex.LeftElbow]).toBeUndefined();
    expect(dropped[LandmarkIndex.LeftWrist]).toBeUndefined();
    expect(dropped[LandmarkIndex.RightElbow]).toBeDefined();
  });

  it("高位下拉侧面：分开的两臂都留，叠住或看不清的远侧臂丢掉", () => {
    const raised: Pose = [];
    raised[LandmarkIndex.LeftShoulder] = { x: 0.42, y: 0.34, visibility: 0.8 };
    raised[LandmarkIndex.RightShoulder] = { x: 0.5, y: 0.32, visibility: 0.9 };
    raised[LandmarkIndex.LeftElbow] = { x: 0.3, y: 0.22, visibility: 0.75 };
    raised[LandmarkIndex.RightElbow] = { x: 0.58, y: 0.2, visibility: 0.9 };
    raised[LandmarkIndex.LeftWrist] = { x: 0.26, y: 0.1, visibility: 0.7 };
    raised[LandmarkIndex.RightWrist] = { x: 0.64, y: 0.1, visibility: 0.9 };
    raised[LandmarkIndex.LeftHip] = { x: 0.46, y: 0.58, visibility: 0.7 };
    raised[LandmarkIndex.RightHip] = { x: 0.52, y: 0.56, visibility: 0.85 };
    const spec = liveSkeletonDrawSpec({
      observedCamera: "side",
      observedConfidence: 0.8,
      pose: raised,
      exerciseId: "lat-pulldown",
    });
    expect(spec.limbPolicy).toBe("near-legs");
    expect(
      liveSkeletonDrawSpec({
        observedCamera: "side",
        observedConfidence: 0.8,
        pose: raised,
        exerciseId: "pullup",
      }).limbPolicy,
    ).toBe("near-legs");
    const kept = filterPoseForOverlay(
      raised,
      spec.nearSide,
      spec.minVisibility,
      spec.limbPolicy,
    );
    expect(kept[LandmarkIndex.LeftElbow]).toBeDefined();
    expect(kept[LandmarkIndex.LeftWrist]).toBeDefined();
    expect(kept[LandmarkIndex.RightElbow]).toBeDefined();
    expect(kept[LandmarkIndex.RightWrist]).toBeDefined();

    const stacked: Pose = raised.slice();
    stacked[LandmarkIndex.LeftElbow] = { x: 0.58, y: 0.21, visibility: 0.8 };
    stacked[LandmarkIndex.LeftWrist] = { x: 0.64, y: 0.12, visibility: 0.4 };
    const dropped = filterPoseForOverlay(
      stacked,
      "right",
      spec.minVisibility,
      "near-legs",
    );
    expect(dropped[LandmarkIndex.LeftElbow]).toBeUndefined();
    expect(dropped[LandmarkIndex.LeftWrist]).toBeUndefined();
    expect(dropped[LandmarkIndex.RightElbow]).toBeDefined();

    const onBar = filterPoseForOverlay(
      stacked,
      "right",
      spec.minVisibility,
      "near-legs",
      true,
    );
    expect(onBar[LandmarkIndex.LeftWrist]).toBeDefined();
    expect(onBar[LandmarkIndex.LeftElbow]).toBeDefined();
  });

  it("贴边假踝不画；远侧低 vis 或叠在近侧上的臂丢掉", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.LeftShoulder] = { x: 0.48, y: 0.32, visibility: 0.8 };
    pose[LandmarkIndex.RightShoulder] = { x: 0.5, y: 0.3, visibility: 0.92 };
    pose[LandmarkIndex.LeftElbow] = { x: 0.57, y: 0.21, visibility: 0.8 };
    pose[LandmarkIndex.RightElbow] = { x: 0.58, y: 0.22, visibility: 0.9 };
    pose[LandmarkIndex.LeftWrist] = { x: 0.56, y: 0.13, visibility: 0.5 };
    pose[LandmarkIndex.RightWrist] = { x: 0.66, y: 0.14, visibility: 0.88 };
    pose[LandmarkIndex.LeftHip] = { x: 0.49, y: 0.55, visibility: 0.6 };
    pose[LandmarkIndex.RightHip] = { x: 0.51, y: 0.52, visibility: 0.8 };
    pose[LandmarkIndex.RightKnee] = { x: 0.52, y: 0.7, visibility: 0.85 };
    pose[LandmarkIndex.RightAnkle] = { x: 0.53, y: 0.99, visibility: 0.9 };
    const spec = liveSkeletonDrawSpec({
      requireSidePlane: true,
      observedCamera: "side",
      observedConfidence: 0.8,
      pose,
      strictDrawVisibility: true,
      exerciseId: "bench-press",
    });
    const filtered = filterPoseForOverlay(
      pose,
      spec.nearSide,
      spec.minVisibility,
      spec.limbPolicy,
    );
    expect(filtered[LandmarkIndex.RightKnee]).toBeDefined();
    expect(filtered[LandmarkIndex.RightAnkle]).toBeUndefined();
    expect(filtered[LandmarkIndex.LeftElbow]).toBeUndefined();
    expect(filtered[LandmarkIndex.LeftWrist]).toBeUndefined();
    expect(filtered[LandmarkIndex.RightElbow]).toBeDefined();
  });

  it("推荐正面却判成侧面 → 不画现场骨、示范窗不跟人", () => {
    const spec = liveSkeletonDrawSpec({
      requireFrontPlane: true,
      observedCamera: "side",
      observedConfidence: 0.7,
      pose: sideBenchPose(),
      strictDrawVisibility: true,
    });
    expect(isWrongCameraPlane({
      requireFrontPlane: true,
      observedCamera: "side",
      observedConfidence: 0.7,
    })).toBe(true);
    expect(spec.drawLive).toBe(false);
    expect(spec.followUserInPip).toBe(false);
  });

  it("深蹲不强制加严 vis，弱可见踝仍可留给绘制层", () => {
    const spec = liveSkeletonDrawSpec({
      requireSidePlane: false,
      observedCamera: "side",
      observedConfidence: 0.8,
      pose: sideBenchPose(),
      strictDrawVisibility: false,
    });
    expect(spec.minVisibility).toBe(0);
  });
});

describe("keepBoneForNearSide", () => {
  it("侧面去掉左右肩连线和对侧臂", () => {
    expect(keepBoneForNearSide(11, 12, "right")).toBe(false);
    expect(keepBoneForNearSide(11, 13, "right")).toBe(false);
    expect(keepBoneForNearSide(12, 14, "right")).toBe(true);
    expect(keepBoneForNearSide(12, 24, "right")).toBe(true);
  });
});

describe("buildSkeletonScene nearSide / minVisibility", () => {
  it("侧面 near=right 不画左臂", () => {
    const scene = buildSkeletonScene(sideBenchPose(), { nearSide: "right" });
    expect(
      scene.bones.some(
        (b) => b.from === LandmarkIndex.LeftShoulder && b.to === LandmarkIndex.LeftElbow,
      ),
    ).toBe(false);
    expect(
      scene.bones.some(
        (b) => b.from === LandmarkIndex.RightShoulder && b.to === LandmarkIndex.RightElbow,
      ),
    ).toBe(true);
    expect(scene.joints.some((j) => j.index === LandmarkIndex.LeftElbow)).toBe(
      false,
    );
  });

  it("不画手指点 17–22", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.RightWrist] = { x: 0.6, y: 0.2, visibility: 0.9 };
    pose[17] = { x: 0.62, y: 0.18, visibility: 0.9 };
    pose[19] = { x: 0.63, y: 0.17, visibility: 0.9 };
    const scene = buildSkeletonScene(pose);
    expect(scene.joints.some((j) => j.index === 17 || j.index === 19)).toBe(
      false,
    );
  });

  it("minVisibility 丢掉杠上的弱可见腕", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.RightShoulder] = { x: 0.5, y: 0.4, visibility: 0.9 };
    pose[LandmarkIndex.RightElbow] = { x: 0.55, y: 0.3, visibility: 0.85 };
    pose[LandmarkIndex.RightWrist] = { x: 0.7, y: 0.1, visibility: 0.22 };
    const scene = buildSkeletonScene(pose, {
      minVisibility: STRICT_DRAW_VISIBILITY,
    });
    expect(scene.joints.some((j) => j.index === LandmarkIndex.RightWrist)).toBe(
      false,
    );
    expect(
      scene.bones.some(
        (b) => b.from === LandmarkIndex.RightElbow && b.to === LandmarkIndex.RightWrist,
      ),
    ).toBe(false);
  });
});
