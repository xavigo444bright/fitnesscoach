/** @fitness-coach/pose-native — App 端姿态推理适配（MediaPipe / ML Kit） */

export const POSE_NATIVE_VERSION = "0.0.0";

export type {
  DetectFn,
  PoseDetector,
  PoseFrame,
  Landmark,
  Pose,
} from "./types.js";
export { MockPoseDetector } from "./mock.js";
export {
  DEFAULT_ONE_EURO,
  OneEuroFilter1D,
  PoseSmoother,
  variance,
  type OneEuroParams,
} from "./oneEuro.js";
export {
  DEFAULT_VISIBILITY_THRESHOLD,
  DRAW_VISIBILITY_THRESHOLD,
  filterByVisibility,
  isVisible,
} from "./visibility.js";
export {
  extractMediapipeLandmarks,
  extractMediapipePoseLists,
  poseFromMediapipeEvent,
  posesFromMediapipeEvent,
  timestampMsFromMediapipeEvent,
} from "./mediapipe.js";
export {
  AdaptiveQualityController,
  DEFAULT_ADAPTIVE_OPTIONS,
  QUALITY_PROFILES,
  type AdaptiveQualityOptions,
  type QualityProfile,
  type QualityTier,
} from "./adaptiveQuality.js";
export {
  DEFAULT_LOW_LIGHT_MEAN_VISIBILITY,
  evaluateLowLight,
  LOW_LIGHT_HINT,
  LOW_LIGHT_KEYPOINTS,
  meanKeypointVisibility,
  type LowLightResult,
} from "./lowLight.js";
