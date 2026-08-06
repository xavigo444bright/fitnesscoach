/** @fitness-coach/pose-mp — 微信小程序姿态推理适配 */

export const POSE_MP_VERSION = "0.1.0";

export type {
  DetectFn,
  PoseDetector,
  PoseFrame,
  Landmark,
  Pose,
} from "./types.js";
export { MockPoseDetector } from "./mock.js";
export {
  COCO_KEYPOINT_NAMES,
  DEFAULT_MOVENET_SCORE_THRESHOLD,
  MOVENET_INDEX_TO_MEDIAPIPE,
  movenetKeypointsToPose,
  type MoveNetKeypoint,
} from "./movenetMap.js";
export {
  analyzeMoveNetResult,
  type CorePoseAnalysis,
  type MoveNetDetectResult,
} from "./analyze.js";
