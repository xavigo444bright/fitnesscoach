/**
 * 课表记训数据层（FR-091 / FR-094 / FR-095 / FR-073）
 * 无 UI。磁盘重量一律公斤；每一组另记输入时的 kg/lb。无 RPE。
 */

export const WORKOUT_LOG_VERSION = 1 as const;

export type LogExerciseRef =
  | { kind: "catalog"; catalogId: string }
  | { kind: "custom"; name: string };

export type LogCountMode = "reps" | "timed";

export type LogSetKind = "reps" | "timed";

export interface LogSet {
  id: string;
  kind: LogSetKind;
  /** 次数；timed 组可空 */
  reps?: number;
  /** 公斤；未填则该组不进容量。容量和比大小都用这个。 */
  weightKg?: number;
  /** 这一组输入时用的单位。缺省 kg。成就按这个显示，不跟全局偏好。 */
  weightUnit?: WeightUnit;
  /** 计时动作有效秒 */
  durationSec?: number;
  /** 组间休息秒数字段（FR-096 UI 下一波） */
  restSec?: number;
  note?: string;
  /** 跟练相机预填次数（可被 reps 覆盖） */
  cameraReps?: number;
  formSummary?: string;
}

export interface LogSlot {
  id: string;
  exercise: LogExerciseRef;
  countMode: LogCountMode;
  sets: LogSet[];
}

export type WorkoutStatus = "open" | "ended";

/** 展示单位。缺省 kg。磁盘上的重量字段仍是公斤。 */
export type WeightUnit = "kg" | "lb";

export interface Workout {
  id: string;
  startedAt: string;
  endedAt?: string;
  status: WorkoutStatus;
  /** 用户填写的训练主题 */
  title?: string;
  /** 本节自重覆盖；缺省用 WorkoutLog.bodyweightKg（「我的」） */
  bodyweightKg?: number;
  slots: LogSlot[];
}

export type TemplateSetDraft = {
  kind: LogSetKind;
  reps?: number;
  weightKg?: number;
  durationSec?: number;
};

export type WorkoutTemplateSlot = {
  exercise: LogExerciseRef;
  countMode: LogCountMode;
  sets: TemplateSetDraft[];
};

/** FR-097 计划模板：动作 + 组次重量快照。 */
export interface WorkoutTemplate {
  id: string;
  name: string;
  createdAt: string;
  slots: WorkoutTemplateSlot[];
}

export interface WorkoutLog {
  version: typeof WORKOUT_LOG_VERSION;
  /** 用户自重公斤；写入组的 kg 后才进容量（FR-094） */
  bodyweightKg?: number;
  workouts: Workout[];
  templates?: WorkoutTemplate[];
}

export interface WorkoutLogIds {
  nextId: () => string;
}

export function emptyWorkoutLog(): WorkoutLog {
  return { version: WORKOUT_LOG_VERSION, workouts: [] };
}

export function exerciseKey(ref: LogExerciseRef): string {
  if (ref.kind === "catalog") return `catalog:${ref.catalogId}`;
  return `custom:${ref.name.trim()}`;
}

export function sameExercise(a: LogExerciseRef, b: LogExerciseRef): boolean {
  return exerciseKey(a) === exerciseKey(b);
}
