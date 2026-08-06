/**
 * MoveNet Lightning（COCO 17）→ MediaPipe Pose（33 槽）映射。
 * 供小程序 detect 结果接入 @fitness-coach/core validate / phase。
 */

import type { Landmark, Pose } from "@fitness-coach/core";

/** MoveNet / COCO-17 关键点名（与 runtime 输出一致）。 */
export const COCO_KEYPOINT_NAMES = [
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
] as const;

/**
 * MoveNet 下标 → MediaPipe Pose Landmark 下标。
 * 未覆盖的点（脸部细节、手、脚等）保持 undefined。
 */
export const MOVENET_INDEX_TO_MEDIAPIPE: readonly number[] = [
  0, // nose
  2, // left_eye → left_eye_inner 近似
  5, // right_eye
  7, // left_ear
  8, // right_ear
  11, // left_shoulder
  12, // right_shoulder
  13, // left_elbow
  14, // right_elbow
  15, // left_wrist
  16, // right_wrist
  23, // left_hip
  24, // right_hip
  25, // left_knee
  26, // right_knee
  27, // left_ankle
  28, // right_ankle
];

const NAME_TO_MEDIAPIPE: Record<string, number> = Object.fromEntries(
  COCO_KEYPOINT_NAMES.map((name, i) => [name, MOVENET_INDEX_TO_MEDIAPIPE[i]!]),
);

export interface MoveNetKeypoint {
  name: string;
  /** 像素坐标（相对相机帧）。 */
  x: number;
  y: number;
  score: number;
}

export const DEFAULT_MOVENET_SCORE_THRESHOLD = 0.15;

/**
 * 将 MoveNet 关键点转为 core Pose（归一化 0–1，长度按 MediaPipe 33 槽稀疏填充）。
 */
export function movenetKeypointsToPose(
  keypoints: readonly MoveNetKeypoint[],
  frameWidth: number,
  frameHeight: number,
  scoreThreshold: number = DEFAULT_MOVENET_SCORE_THRESHOLD,
): Pose {
  if (frameWidth <= 0 || frameHeight <= 0) {
    throw new Error(`非法帧尺寸: ${frameWidth}x${frameHeight}`);
  }
  const pose: Pose = new Array(33);
  for (const kp of keypoints) {
    if (!kp || kp.score < scoreThreshold) continue;
    const idx = NAME_TO_MEDIAPIPE[kp.name];
    if (idx === undefined) continue;
    const landmark: Landmark = {
      x: kp.x / frameWidth,
      y: kp.y / frameHeight,
      visibility: kp.score,
    };
    pose[idx] = landmark;
  }
  return pose;
}
