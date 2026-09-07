import {
  LandmarkIndex,
  getDemoTrajectory,
  poseFromFrame,
  sampleTrajectoryAt,
  type Pose,
} from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import {
  activeMuscleKinds,
  inferNearLimbSide,
  limbLateralityFromVolumeId,
  muscleEmphasisFor,
  pipVolumesToPaint,
  sortVolumesForPaint,
} from "./muscleTint.js";
import { buildRig3d } from "./rig3d.js";

describe("muscleTint (FR-085 / T9-3)", () => {
  it("reads active muscles from catalog (squat vs pushup)", () => {
    expect([...activeMuscleKinds("squat")].sort()).toEqual(["pelvis", "thigh"]);
    expect([...activeMuscleKinds("pushup")].sort()).toEqual([
      "chest",
      "upperArm",
    ]);
    expect(muscleEmphasisFor("pelvis", "squat")).toBe("active");
    expect(muscleEmphasisFor("thigh", "squat")).toBe("active");
    expect(muscleEmphasisFor("chest", "squat")).toBe("rest");
    expect(muscleEmphasisFor("chest", "pushup")).toBe("active");
    expect(muscleEmphasisFor("upperArm", "pushup")).toBe("active");
    expect(muscleEmphasisFor("thigh", "pushup")).toBe("rest");
    expect(muscleEmphasisFor("head", "squat")).toBe("rest");
  });

  it("falls back to bodyPart for unregistered catalog exercises", () => {
    expect([...activeMuscleKinds("calf-raise")].sort()).toEqual([
      "pelvis",
      "thigh",
    ]);
    expect(activeMuscleKinds("not-an-exercise").size).toBe(0);
  });

  it("drops the far-side thigh on side view so blobs do not stack", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.LeftShoulder] = { x: 0.5, y: 0.28, visibility: 0.9 };
    pose[LandmarkIndex.RightShoulder] = { x: 0.52, y: 0.28, visibility: 0.4 };
    pose[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.52, visibility: 0.92 };
    pose[LandmarkIndex.RightHip] = { x: 0.52, y: 0.52, visibility: 0.35 };
    pose[LandmarkIndex.LeftKnee] = { x: 0.5, y: 0.72, visibility: 0.9 };
    pose[LandmarkIndex.RightKnee] = { x: 0.52, y: 0.72, visibility: 0.3 };
    pose[LandmarkIndex.LeftAnkle] = { x: 0.5, y: 0.92, visibility: 0.85 };
    pose[LandmarkIndex.RightAnkle] = { x: 0.52, y: 0.92, visibility: 0.28 };
    pose[LandmarkIndex.LeftElbow] = { x: 0.48, y: 0.4, visibility: 0.8 };
    pose[LandmarkIndex.RightElbow] = { x: 0.54, y: 0.4, visibility: 0.3 };
    pose[LandmarkIndex.LeftWrist] = { x: 0.47, y: 0.5, visibility: 0.8 };
    pose[LandmarkIndex.RightWrist] = { x: 0.55, y: 0.5, visibility: 0.3 };
    expect(inferNearLimbSide(pose, "side")).toBe("left");
    expect(inferNearLimbSide(pose, "front")).toBe("both");

    const rig = buildRig3d(pose, { cameraHint: "side", exerciseId: "squat" })!;
    const painted = pipVolumesToPaint(rig.volumes, {
      exerciseId: "squat",
      cameraHint: "side",
      pose,
    });
    const thighs = painted.filter((p) => p.volume.kind === "thigh");
    expect(thighs.length).toBe(1);
    expect(limbLateralityFromVolumeId(thighs[0]!.volume.id)).toBe("left");
    expect(thighs[0]!.emphasis).toBe("active");
    expect(thighs[0]!.scale).toBeLessThan(0.7);
    const restChest = painted.find((p) => p.volume.kind === "chest");
    expect(restChest?.emphasis).toBe("rest");
  });

  it("手臂更清楚的一侧赢过躯干可见度", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.LeftShoulder] = { x: 0.5, y: 0.28, visibility: 0.92 };
    pose[LandmarkIndex.RightShoulder] = { x: 0.52, y: 0.28, visibility: 0.45 };
    pose[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.52, visibility: 0.95 };
    pose[LandmarkIndex.RightHip] = { x: 0.52, y: 0.52, visibility: 0.4 };
    pose[LandmarkIndex.LeftKnee] = { x: 0.5, y: 0.72, visibility: 0.9 };
    pose[LandmarkIndex.RightKnee] = { x: 0.52, y: 0.72, visibility: 0.35 };
    pose[LandmarkIndex.LeftAnkle] = { x: 0.5, y: 0.92, visibility: 0.88 };
    pose[LandmarkIndex.RightAnkle] = { x: 0.52, y: 0.92, visibility: 0.3 };
    pose[LandmarkIndex.RightElbow] = { x: 0.72, y: 0.38, visibility: 0.9 };
    pose[LandmarkIndex.RightWrist] = { x: 0.88, y: 0.4, visibility: 0.88 };
    expect(inferNearLimbSide(pose, "side")).toBe("right");
  });

  it("keeps both thighs on front view", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.LeftShoulder] = { x: 0.42, y: 0.28, visibility: 0.9 };
    pose[LandmarkIndex.RightShoulder] = { x: 0.58, y: 0.28, visibility: 0.9 };
    pose[LandmarkIndex.LeftElbow] = { x: 0.38, y: 0.4, visibility: 0.85 };
    pose[LandmarkIndex.RightElbow] = { x: 0.62, y: 0.4, visibility: 0.85 };
    pose[LandmarkIndex.LeftWrist] = { x: 0.36, y: 0.5, visibility: 0.8 };
    pose[LandmarkIndex.RightWrist] = { x: 0.64, y: 0.5, visibility: 0.8 };
    pose[LandmarkIndex.LeftHip] = { x: 0.44, y: 0.52, visibility: 0.9 };
    pose[LandmarkIndex.RightHip] = { x: 0.56, y: 0.52, visibility: 0.9 };
    pose[LandmarkIndex.LeftKnee] = { x: 0.43, y: 0.72, visibility: 0.88 };
    pose[LandmarkIndex.RightKnee] = { x: 0.57, y: 0.72, visibility: 0.88 };
    pose[LandmarkIndex.LeftAnkle] = { x: 0.42, y: 0.92, visibility: 0.85 };
    pose[LandmarkIndex.RightAnkle] = { x: 0.58, y: 0.92, visibility: 0.85 };
    const rig = buildRig3d(pose, { cameraHint: "front", exerciseId: "squat" })!;
    const painted = pipVolumesToPaint(rig.volumes, {
      exerciseId: "squat",
      cameraHint: "front",
      pose,
    });
    const thighs = painted.filter((p) => p.volume.kind === "thigh");
    expect(thighs.length).toBe(2);
  });

  it("emits thigh and upperArm volumes on squat/pushup demo poses", () => {
    const squat = poseFromFrame(
      sampleTrajectoryAt(getDemoTrajectory("squat", "side"), 0.45),
    );
    const push = poseFromFrame(
      sampleTrajectoryAt(getDemoTrajectory("pushup", "side"), 0.45),
    );
    const squatRig = buildRig3d(squat, {
      cameraHint: "side",
      exerciseId: "squat",
    });
    const pushRig = buildRig3d(push, {
      cameraHint: "side",
      exerciseId: "pushup",
    });
    expect(squatRig).not.toBeNull();
    expect(pushRig).not.toBeNull();
    const squatKinds = new Set(squatRig!.volumes.map((v) => v.kind));
    const pushKinds = new Set(pushRig!.volumes.map((v) => v.kind));
    expect(squatKinds.has("chest")).toBe(true);
    expect(squatKinds.has("pelvis")).toBe(true);
    expect(squatKinds.has("thigh")).toBe(true);
    expect(pushKinds.has("chest")).toBe(true);
    expect(pushKinds.has("upperArm")).toBe(true);
  });

  it("paints active volumes after rest volumes", () => {
    const pose = poseFromFrame(
      sampleTrajectoryAt(getDemoTrajectory("squat", "side"), 0.45),
    );
    const rig = buildRig3d(pose, { cameraHint: "side", exerciseId: "squat" })!;
    const painted = sortVolumesForPaint(rig.volumes, "squat");
    const firstActive = painted.findIndex(
      (v) => muscleEmphasisFor(v.kind, "squat") === "active",
    );
    const lastRest = painted.reduce((acc, v, i) => {
      return muscleEmphasisFor(v.kind, "squat") === "rest" ? i : acc;
    }, -1);
    expect(firstActive).toBeGreaterThan(-1);
    expect(lastRest).toBeGreaterThan(-1);
    expect(lastRest).toBeLessThan(firstActive);
  });
});
