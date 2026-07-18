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
  filterByVisibility,
  isVisible,
} from "./visibility.js";
