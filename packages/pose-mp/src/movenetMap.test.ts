import { describe, expect, it } from "vitest";
import {
  LandmarkIndex,
  SQUAT_RULES,
  buildSquatPose,
  squatKneeAngle,
  validate,
} from "@fitness-coach/core";
import {
  MOVENET_INDEX_TO_MEDIAPIPE,
  movenetKeypointsToPose,
  type MoveNetKeypoint,
} from "./movenetMap.js";

function poseToMoveNetKeypoints(
  pose: ReturnType<typeof buildSquatPose>,
  w = 192,
  h = 192,
): MoveNetKeypoint[] {
  const pairs: [string, number][] = [
    ["left_shoulder", LandmarkIndex.LeftShoulder],
    ["right_shoulder", LandmarkIndex.RightShoulder],
    ["left_hip", LandmarkIndex.LeftHip],
    ["right_hip", LandmarkIndex.RightHip],
    ["left_knee", LandmarkIndex.LeftKnee],
    ["right_knee", LandmarkIndex.RightKnee],
    ["left_ankle", LandmarkIndex.LeftAnkle],
    ["right_ankle", LandmarkIndex.RightAnkle],
  ];
  return pairs.map(([name, idx]) => {
    const lm = pose[idx]!;
    return { name, x: lm.x * w, y: lm.y * h, score: lm.visibility ?? 1 };
  });
}

describe("movenetMap (M2B-T2)", () => {
  it("maps 17 MoveNet indices onto MediaPipe slots", () => {
    expect(MOVENET_INDEX_TO_MEDIAPIPE).toHaveLength(17);
    expect(MOVENET_INDEX_TO_MEDIAPIPE[13]).toBe(LandmarkIndex.LeftKnee);
    expect(MOVENET_INDEX_TO_MEDIAPIPE[15]).toBe(LandmarkIndex.LeftAnkle);
  });

  it("normalizes pixel keypoints into core Pose", () => {
    const src = buildSquatPose({ kneeDeg: 85, torsoLeanDeg: 28 });
    const kps = poseToMoveNetKeypoints(src, 320, 240);
    const pose = movenetKeypointsToPose(kps, 320, 240);
    expect(pose[LandmarkIndex.LeftKnee]?.x).toBeCloseTo(
      src[LandmarkIndex.LeftKnee]!.x,
      5,
    );
    expect(pose[LandmarkIndex.LeftKnee]?.visibility).toBeGreaterThan(0.15);
  });

  it("mapped pose is validatable by core (VT-P5-003 bridge)", () => {
    const src = buildSquatPose({ kneeDeg: 85, torsoLeanDeg: 28 });
    const pose = movenetKeypointsToPose(poseToMoveNetKeypoints(src), 192, 192);
    const knee = squatKneeAngle(pose);
    expect(knee).not.toBeNull();
    expect(knee!).toBeGreaterThan(70);
    expect(knee!).toBeLessThan(100);
    const result = validate(pose, "bottom", SQUAT_RULES);
    expect(result.status).toBe("correct");
  });

  it("drops low-score keypoints", () => {
    const pose = movenetKeypointsToPose(
      [{ name: "left_knee", x: 10, y: 20, score: 0.05 }],
      100,
      100,
    );
    expect(pose[LandmarkIndex.LeftKnee]).toBeUndefined();
  });
});
