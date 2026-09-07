/**
 * MediaPipe Pose 33 点常用连线（躯干+四肢）。
 * 索引与 @fitness-coach/core LandmarkIndex 一致。
 */

import { LandmarkIndex } from "@fitness-coach/core";
import type { LimbLaterality, NearLimbSide } from "./muscleTint.js";

export type BonePair = readonly [number, number];

/** MediaPipe Pose 面部点 0–10。 */
export const FACE_LANDMARK_MAX = 10;

/**
 * 面部只留轮廓：耳 → 外眼角 → 鼻，不画眼内/嘴角碎点。
 */
export const FACE_CONTOUR_JOINTS: ReadonlySet<number> = new Set([
  LandmarkIndex.Nose,
  LandmarkIndex.LeftEyeOuter,
  LandmarkIndex.RightEyeOuter,
  LandmarkIndex.LeftEar,
  LandmarkIndex.RightEar,
]);

export const FACE_CONTOUR_BONES: readonly BonePair[] = [
  [LandmarkIndex.LeftEar, LandmarkIndex.LeftEyeOuter],
  [LandmarkIndex.LeftEyeOuter, LandmarkIndex.Nose],
  [LandmarkIndex.Nose, LandmarkIndex.RightEyeOuter],
  [LandmarkIndex.RightEyeOuter, LandmarkIndex.RightEar],
] as const;

export function isFaceLandmark(index: number): boolean {
  return index >= 0 && index <= FACE_LANDMARK_MAX;
}

/** MediaPipe 17–22：粉红指 / 食指 / 拇指。不画成关节点。 */
export const HAND_LANDMARK_MIN = 17;
export const HAND_LANDMARK_MAX = 22;

export function isHandLandmark(index: number): boolean {
  return index >= HAND_LANDMARK_MIN && index <= HAND_LANDMARK_MAX;
}

const DISTAL_LEG = new Set<number>([
  LandmarkIndex.LeftKnee,
  LandmarkIndex.RightKnee,
  LandmarkIndex.LeftAnkle,
  LandmarkIndex.RightAnkle,
  LandmarkIndex.LeftHeel,
  LandmarkIndex.RightHeel,
  LandmarkIndex.LeftFootIndex,
  LandmarkIndex.RightFootIndex,
]);

export function isDistalLegLandmark(index: number): boolean {
  return DISTAL_LEG.has(index);
}

/** 侧面近侧策略：全身 / 近侧四肢 / 只藏远侧小腿。 */
export type OverlayLimbPolicy = "all" | "near-all" | "near-legs";

export function keepJointForOverlay(
  index: number,
  nearSide: NearLimbSide,
  policy: OverlayLimbPolicy,
): boolean {
  if (isHandLandmark(index)) return false;
  if (policy === "all" || nearSide === "both") return true;
  if (policy === "near-all") return keepJointForNearSide(index, nearSide);
  const side = landmarkLaterality(index);
  if (side === "mid" || side === nearSide) return true;
  return !isDistalLegLandmark(index);
}

/** 面部碎点丢掉；躯干四肢原样。 */
export function keepFaceJointForContour(index: number): boolean {
  if (!isFaceLandmark(index)) return true;
  return FACE_CONTOUR_JOINTS.has(index);
}

/** 绘制用连接表（躯干+四肢；面部轮廓另表 FACE_CONTOUR_BONES）。 */
export const POSE_BONES: readonly BonePair[] = [
  // 肩带 / 躯干
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  // 左臂
  [11, 13],
  [13, 15],
  // 右臂
  [12, 14],
  [14, 16],
  // 左腿
  [23, 25],
  [25, 27],
  [27, 29],
  [27, 31],
  // 右腿
  [24, 26],
  [26, 28],
  [28, 30],
  [28, 32],
] as const;

const LEFT_LANDMARKS = new Set<number>([
  LandmarkIndex.LeftEyeInner,
  LandmarkIndex.LeftEye,
  LandmarkIndex.LeftEyeOuter,
  LandmarkIndex.LeftEar,
  LandmarkIndex.MouthLeft,
  LandmarkIndex.LeftShoulder,
  LandmarkIndex.LeftElbow,
  LandmarkIndex.LeftWrist,
  LandmarkIndex.LeftHip,
  LandmarkIndex.LeftKnee,
  LandmarkIndex.LeftAnkle,
  LandmarkIndex.LeftHeel,
  LandmarkIndex.LeftFootIndex,
]);

const RIGHT_LANDMARKS = new Set<number>([
  LandmarkIndex.RightEyeInner,
  LandmarkIndex.RightEye,
  LandmarkIndex.RightEyeOuter,
  LandmarkIndex.RightEar,
  LandmarkIndex.MouthRight,
  LandmarkIndex.RightShoulder,
  LandmarkIndex.RightElbow,
  LandmarkIndex.RightWrist,
  LandmarkIndex.RightHip,
  LandmarkIndex.RightKnee,
  LandmarkIndex.RightAnkle,
  LandmarkIndex.RightHeel,
  LandmarkIndex.RightFootIndex,
]);

export function landmarkLaterality(index: number): LimbLaterality {
  if (LEFT_LANDMARKS.has(index)) return "left";
  if (RIGHT_LANDMARKS.has(index)) return "right";
  return "mid";
}

/** 侧面只保留近镜头一侧；左右肩/髋连线在侧视会叠成网，一并去掉。 */
export function keepJointForNearSide(
  index: number,
  nearSide: NearLimbSide,
): boolean {
  if (nearSide === "both") return true;
  const side = landmarkLaterality(index);
  return side === "mid" || side === nearSide;
}

export function keepBoneForNearSide(
  from: number,
  to: number,
  nearSide: NearLimbSide,
): boolean {
  if (nearSide === "both") return true;
  return keepJointForNearSide(from, nearSide) && keepJointForNearSide(to, nearSide);
}
