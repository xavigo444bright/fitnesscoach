/** @fitness-coach/ui — 设计令牌 + 组件 props（MU） */

export const UI_VERSION = "0.0.0";

export {
  colors,
  fontSize,
  fontWeight,
  space,
  radius,
  layout,
  motion,
  theme,
  getTheme,
  type Theme,
} from "./theme.js";
export {
  muscleFill,
  type MuscleFillEmphasis,
  type MuscleFillKind,
} from "./muscleFill.js";
export {
  clampPipPosition,
  collapsedTabPosition,
  defaultPipPosition,
  restoredPipPosition,
  type PipPoint,
} from "./pipPosition.js";

export {
  CLIP_PLAYBACK_RATES,
  DEFAULT_CLIP_PLAYBACK_RATE,
  clipPlayerInitialStatus,
  clipShouldPlay,
  formatClipPlaybackRate,
  nextClipPlaybackRate,
  shouldRestartClipLoop,
  type ClipPlaybackRate,
} from "./clipPlayback.js";

export type {
  SemanticStatus,
  FeedbackBarPhase,
  FeedbackItem,
  ExerciseCardProps,
  PrimaryButtonProps,
  SecondaryButtonProps,
  FeedbackBarProps,
  RepCounterProps,
  PlacementGuideProps,
  CountdownOverlayProps,
  HoldTimerOverlayProps,
  SessionSummaryProps,
  CameraPreviewProps,
  SkeletonJoint,
  SkeletonOverlayProps,
  StatChipProps,
} from "./components.js";
