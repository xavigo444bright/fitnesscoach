/** @fitness-coach/render — 骨骼绘制逻辑（平台无关） */

export const RENDER_VERSION = "0.0.0";

export type {
  RenderBone,
  RenderJoint,
  SkeletonScene,
} from "./types.js";
export {
  FACE_CONTOUR_BONES,
  FACE_CONTOUR_JOINTS,
  FACE_LANDMARK_MAX,
  HAND_LANDMARK_MAX,
  HAND_LANDMARK_MIN,
  POSE_BONES,
  isDistalLegLandmark,
  isFaceLandmark,
  isHandLandmark,
  keepBoneForNearSide,
  keepFaceJointForContour,
  keepJointForNearSide,
  keepJointForOverlay,
  landmarkLaterality,
  type BonePair,
  type OverlayLimbPolicy,
} from "./bones.js";
export {
  buildSkeletonScene,
  type BuildSkeletonOptions,
} from "./buildSkeleton.js";
export { applyJointColors } from "./colorJoints.js";
export {
  cuesFromValidation,
  DEFAULT_FEEDBACK_BAR_CONFIG,
  recoverMessageByIdFor,
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
  composePlacementHint,
  formatPlacementCoachHint,
  DEFAULT_PLACEMENT_CONFIG,
  evaluatePlacement,
  allowSessionCount,
  placementConfigFor,
  PLANK_PLACEMENT_CONFIG,
  UPPER_BODY_PLACEMENT_CONFIG,
  type HipAnkleMode,
  type PlacementConfig,
  type PlacementGuideResult,
  type PlacementHintContext,
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
  canonicalPoseFromTrajectory,
  canonicalPoseFromUser,
  fitPoseToFrame,
  referencePoseFromTrajectory,
  type ReferenceSkeletonOptions,
} from "./referenceSkeleton.js";
export {
  aabbFromRig,
  fitAabbToPixelRect,
  mapSkeletonToPip,
  mapToPipPx,
  type Aabb2,
  type PipFit,
} from "./pipLayout.js";
export {
  buildRig3d,
  bodyThicknessForRig,
  muscleRadiusForBone,
  poseToOrthoWorld,
  reconstructJointZ,
  RIG_HEAD,
  RIG_MID_HIP,
  RIG_MID_SHOULDER,
  type Rig3dBone,
  type Rig3dJoint,
  type Rig3dOptions,
  type Rig3dScene,
  type Rig3dVolume,
  type Rig3dVolumeKind,
} from "./rig3d.js";
export {
  activeMuscleKinds,
  inferNearLimbSide,
  limbLateralityFromVolumeId,
  muscleEmphasisFor,
  pipPaintScale,
  pipVolumesToPaint,
  sortVolumesForPaint,
  type MuscleEmphasis,
  type NearLimbSide,
  type PipVolumePaint,
} from "./muscleTint.js";
export {
  HUMANOID_AIM_CHAIN,
  completeBodyPose,
  figureScaleFromHeights,
  humanoidRoleForBoneName,
  humanoidTargetsFromPose,
  normalizeBoneName,
  type HumanoidBoneRole,
  type HumanoidJointId,
  type HumanoidTargets,
  type Vec3 as HumanoidVec3,
} from "./humanoid.js";
export {
  CameraHintLatch,
  inferCameraHint,
  inferCameraHintDetailed,
  type CameraHint,
  type CameraHintInference,
} from "./cameraHint.js";
export {
  STRICT_DRAW_VISIBILITY,
  WRONG_PLANE_CONFIDENCE,
  filterPoseForOverlay,
  isWrongCameraPlane,
  liveSkeletonDrawSpec,
  type LiveSkeletonDrawSpec,
} from "./liveSkeleton.js";
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
