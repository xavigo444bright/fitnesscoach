/** @fitness-coach/render — 骨骼绘制逻辑（平台无关） */

export const RENDER_VERSION = "0.0.0";

export type {
  RenderBone,
  RenderJoint,
  SkeletonScene,
} from "./types.js";
export { POSE_BONES, type BonePair } from "./bones.js";
export {
  buildSkeletonScene,
  type BuildSkeletonOptions,
} from "./buildSkeleton.js";
export { applyJointColors } from "./colorJoints.js";
export {
  cuesFromValidation,
  DEFAULT_FEEDBACK_BAR_CONFIG,
  initialFeedbackBarState,
  stepFeedbackBar,
  type FeedbackBarConfig,
  type FeedbackBarCue,
  type FeedbackBarItem,
  type FeedbackBarState,
} from "./feedbackBar.js";
export {
  initialWiredFeedbackState,
  stepWiredFeedback,
  type WiredFeedbackState,
} from "./wireFeedback.js";
export {
  DEFAULT_PLACEMENT_CONFIG,
  evaluatePlacement,
  type PlacementConfig,
  type PlacementGuideResult,
  type PlacementReason,
} from "./placement.js";
export {
  alignGhostToUser,
  bodyOnlyPose,
  BODY_LANDMARK_INDEXES,
  estimateAlignScale,
  estimateAlignScaleDetailed,
  estimateAlignTransform,
  GhostScaleSmoother,
  ghostPoseForExercise,
  ghostPoseForPhase,
  inferSideFacing,
  inferSideFacingDetailed,
  lerpPose,
  matchSideFacing,
  mirrorPoseX,
  orientPoseToFacing,
  resolveAlignMode,
  SideFacingLatch,
  type AlignGhostOptions,
  type GhostAlignMode,
  type GhostAlignTransform,
  type SideFacing,
  type SideFacingInference,
} from "./ghost.js";
export {
  referencePoseFromTrajectory,
  type ReferenceSkeletonOptions,
} from "./referenceSkeleton.js";
export {
  CameraHintLatch,
  inferCameraHint,
  inferCameraHintDetailed,
  type CameraHint,
  type CameraHintInference,
} from "./cameraHint.js";
export { repDisplayFromState, type RepDisplay } from "./repDisplay.js";
export {
  beginFaultCycle,
  celebrateFixedFaults,
  dismissFaultReview,
  initialLastFaultState,
  noteCycleFaults,
  sealRejectedCycle,
  toggleFaultReview,
  type FaultIssue,
  type LastFaultState,
} from "./lastFault.js";
