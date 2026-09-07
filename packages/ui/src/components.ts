/**
 * @fitness-coach/ui — 组件 props 契约（MU-T3，对齐 UI.md §4 CMP-001~011）
 *
 * 本包只定义类型与纯数据；RN / 小程序各自做视觉 adapter，禁止在此写摄像头或 core 校验。
 */

/** 校验语义（与 FR-061 / core ValidationStatus 对齐）。 */
export type SemanticStatus = "correct" | "warning" | "error";

/** FeedbackBar 展示态（UI.md PG-004）。 */
export type FeedbackBarPhase = "idle" | "correcting" | "recovered";

export interface FeedbackItem {
  /** 规则 ID，如 knee-valgus-l；恢复态可复用。 */
  ruleId: string;
  message: string;
  severity: Exclude<SemanticStatus, "correct"> | "correct";
  phase: Exclude<FeedbackBarPhase, "idle">;
}

/** CMP-001 */
export interface ExerciseCardProps {
  name: string;
  bodyPart: string;
  cameraHint: string;
  onPress?: () => void;
}

/** CMP-002 */
export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** CMP-003 */
export interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** CMP-004 — 最多 2 条；含 recovered 正反馈。 */
export interface FeedbackBarProps {
  items: FeedbackItem[];
  /** idle 时是否完全隐藏。默认 true。 */
  hideWhenIdle?: boolean;
}

/** CMP-005 */
export interface RepCounterProps {
  count: number;
  onEnd?: () => void;
  endLabel?: string;
  /** 默认 Rep；平板支撑传「秒」。 */
  caption?: string;
}

/** CMP-006 */
export interface PlacementGuideProps {
  visible: boolean;
  hint?: string;
}

/** CMP-007 */
export interface CountdownOverlayProps {
  /** 当前秒，如 3/2/1；null 表示隐藏。 */
  seconds: number | null;
}

/** CMP-015 — hold_second 中央计时（与 UX-007 打勾同位置同尺寸）。 */
export interface HoldTimerOverlayProps {
  /** 正在有效计时（撑稳）时为 true；暂停时隐藏。 */
  active: boolean;
  /** 本场已计入的有效整秒（与底栏汇总相同）。 */
  seconds: number;
}

/** CMP-008 */
export interface SessionSummaryProps {
  reps: number;
  durationLabel: string;
  topIssue?: { message: string; count: number };
  onRetry: () => void;
  onBack: () => void;
}

/** CMP-009 — 仅布局槽；具体 camera 由平台注入。 */
export interface CameraPreviewProps {
  /** 是否铺满训练区。 */
  fullScreen?: boolean;
}

/** CMP-010 — 数据由 M3 render 提供，此处只定消费形状。 */
export interface SkeletonJoint {
  x: number;
  y: number;
  status: SemanticStatus;
}

export interface SkeletonOverlayProps {
  joints: SkeletonJoint[];
  /** 连线端点索引对。 */
  bones: Array<[number, number]>;
  ghostJoints?: Array<{ x: number; y: number }>;
  ghostOpacity?: number;
}

/** CMP-011 */
export interface StatChipProps {
  label: string;
  value: string;
}
