/**
 * @fitness-coach/core — 平台无关类型定义（M1-T1）
 *
 * 真源：docs/exercises/squat-rules.md、docs/VERIFICATION.md Phase 1。
 * 本文件只放类型，不含任何逻辑；禁止依赖摄像头或 UI。
 */

/** 归一化坐标（0–1，相对帧宽高）；z 为可选深度，visibility 为置信度 0–1。 */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/**
 * MediaPipe/MoveNet 关键点索引（与 MediaPipe Pose 33 点对齐，见 squat-rules.md）。
 * App 用 MediaPipe 33 点；小程序 MoveNet 17 点需在 pose 适配层映射到同一语义。
 */
export enum LandmarkIndex {
  Nose = 0,
  LeftEyeInner = 1,
  LeftEye = 2,
  LeftEyeOuter = 3,
  RightEyeInner = 4,
  RightEye = 5,
  RightEyeOuter = 6,
  LeftEar = 7,
  RightEar = 8,
  MouthLeft = 9,
  MouthRight = 10,
  LeftShoulder = 11,
  RightShoulder = 12,
  LeftElbow = 13,
  RightElbow = 14,
  LeftWrist = 15,
  RightWrist = 16,
  LeftHip = 23,
  RightHip = 24,
  LeftKnee = 25,
  RightKnee = 26,
  LeftAnkle = 27,
  RightAnkle = 28,
  LeftHeel = 29,
  RightHeel = 30,
  LeftFootIndex = 31,
  RightFootIndex = 32,
}

/** 一帧姿态：按索引存放的关键点数组（缺失点为 undefined）。 */
export type Pose = Array<Landmark | undefined>;

/** 计算夹角的三点（顶点为 b）。 */
export interface JointTriplet {
  a: LandmarkIndex;
  b: LandmarkIndex;
  c: LandmarkIndex;
}

/** 动作相位（深蹲状态机，见 squat-rules.md §相位定义）。 */
export type Phase = "stand" | "descend" | "bottom" | "ascend";

/** 规则严重度。 */
export type Severity = "error" | "warning";

/** validate 汇总状态：任一 error→error；否则任一 warning→warning；否则 correct。 */
export type ValidationStatus = "correct" | "warning" | "error";

/**
 * 单条校验规则的静态定义（与 squat-rules.md 的规则表一一对应）。
 * 具体判定函数在 exercises/<name>.ts 中实现并引用本类型。
 */
export interface RuleDefinition {
  /** 规则 ID，如 "squat-depth"，须与 squat-rules.md 一致。 */
  id: string;
  /** 参与判定的关节三点。 */
  joints: JointTriplet;
  /** 触发严重度。 */
  severity: Severity;
  /** 生效相位；空表示所有相位。 */
  phases: Phase[];
  /** 角度容差（度）。 */
  toleranceDeg: number;
  /** 触发时展示的提示文案。 */
  message: string;
}

/** 规则判定结果（单帧、单规则）。 */
export interface RuleResult {
  id: string;
  triggered: boolean;
  severity: Severity;
  message: string;
  /** 参与判定的测量角度（度），用于调试与叠加显示。 */
  measuredDeg?: number;
}

/** validate 的单帧输出。 */
export interface ValidationResult {
  status: ValidationStatus;
  messages: string[];
  results: RuleResult[];
}

/** 相位状态机的持有状态（跨帧）。 */
export interface PhaseState {
  phase: Phase;
  /** 候选下一相位已连续满足的帧数（用于 5 帧确认）。 */
  pendingPhase: Phase | null;
  pendingFrames: number;
}

/** 单次 rep 的记录。 */
export interface RepEvent {
  index: number;
  /** 该 rep 是否达标（bottom 阶段未触发 squat-depth 则计入）。 */
  counted: boolean;
}

/** 本帧刚发生的周期结算（仅事件帧非 null，供 UI 提示）。 */
export type RepCycleOutcome =
  | { type: "counted" }
  | { type: "rejected"; reason: "shallow" | "depth_fault" };

/** repCounter 状态。 */
export interface RepCounterState {
  count: number;
  reps: RepEvent[];
  phaseState: PhaseState;
  /** 本次下蹲周期内是否出现过深度不足。 */
  depthFaultThisCycle: boolean;
  /** 本帧结算结果；无结算则为 null。 */
  lastOutcome: RepCycleOutcome | null;
  /** 静力动作累计毫秒（仅 countMode=hold_second）。 */
  holdAccumMs: number;
  holdAnchorMs: number | null;
  /** 当前周期内驱动角最小/最大（侧平举最小行程）。 */
  cycleDriveMin: number | null;
  cycleDriveMax: number | null;
}

/** 一个动作的完整定义（角度、规则、相位阈值集合）。 */
export interface ExerciseDefinition {
  id: string;
  name: string;
  /** 推荐机位提示。 */
  cameraHint: "side" | "front";
  rules: RuleDefinition[];
  /** 相位进入阈值（膝角，度）与确认帧数。 */
  phaseThresholds: {
    standAboveDeg: number;
    bottomBelowDeg: number;
    confirmFrames: number;
  };
}

/** 测试夹具的通用形状（见 fixtures/ 与 VT-P1-010）。 */
export interface Fixture {
  id: string;
  description: string;
  /** 单帧夹具的姿态，或序列夹具的多帧姿态。 */
  pose?: Pose;
  sequence?: Pose[];
  /** 期望的 validate 汇总状态（单帧夹具）。 */
  expectedStatus?: ValidationStatus;
  /** 期望触发的规则 ID 列表。 */
  expectedRuleIds?: string[];
  /** 序列夹具期望的 rep 数。 */
  expectedRepCount?: number;
}
