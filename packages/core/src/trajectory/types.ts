/**
 * 示范轨迹格式（FR-067 / T7-1）
 * 真源：docs/exercises/trajectory-pipeline.md
 */

import type { Phase } from "../types.js";

/** 轨迹 schema 版本；解析时校验。 */
export const TRAJECTORY_SCHEMA_VERSION = "1.0" as const;

export type TrajectoryExerciseId =
  | "squat"
  | "pushup"
  | "glute-bridge"
  | "lunge"
  | "plank"
  | "db-row"
  | "ohp"
  | "bench-press"
  | "rdl"
  | "pullup"
  | "db-fly"
  | "dip"
  | "incline-pushup"
  | "cable-crossover"
  | "chest-press-machine"
  | "lateral-raise"
  | "front-raise"
  | "rear-delt-fly"
  | "face-pull"
  | "pike-pushup";

export type TrajectorySourceType = "synthetic" | "video" | "pose_dump";

/** 稀疏关键点：i = MediaPipe 索引（与 LandmarkIndex 一致）。 */
export interface TrajectoryLandmark {
  i: number;
  x: number;
  y: number;
  z?: number;
  /** visibility 0–1 */
  v?: number;
}

/**
 * 单帧：t ∈ [0,1] 为清洗后单 rep 循环内的归一化进度（供 T7-2 对齐）。
 */
export interface TrajectoryFrame {
  t: number;
  phase?: Phase;
  /** 驱动角（深蹲膝角 / 俯卧撑肘角 / 臀桥为 180−髋伸角，静息高、顶髋低） */
  driveDeg?: number;
  landmarks: TrajectoryLandmark[];
}

export interface TrajectorySource {
  type: TrajectorySourceType;
  /** 人类可读来源说明 */
  label?: string;
  /** 原始采样帧率（若可知） */
  fps?: number;
}

export interface TrajectoryMeta {
  landmarkScheme: "mediapipe33";
  cameraHint: "side" | "front";
  /** 清洗前原始帧数 */
  rawFrameCount?: number;
  /** 截取的循环在原始序列中的起止帧（含） */
  loopFrameRange?: [number, number];
  createdAt?: string;
  notes?: string;
}

/**
 * 一条可入库、可被 core/App 加载的示范轨迹（单 rep 清洗循环）。
 */
export interface DemoTrajectory {
  schemaVersion: typeof TRAJECTORY_SCHEMA_VERSION;
  id: string;
  exerciseId: TrajectoryExerciseId;
  source: TrajectorySource;
  meta: TrajectoryMeta;
  frames: TrajectoryFrame[];
}

/**
 * 离线姿态 dump（视频→姿态后的中间格式，供提取器消费）。
 * landmarks 可用稀疏 TrajectoryLandmark[]，或按索引的稠密数组（缺省 null）。
 */
export interface PoseDumpFrame {
  /** 相对视频起点的毫秒；缺省则按顺序 + fps 推算 */
  tMs?: number;
  landmarks: TrajectoryLandmark[] | Array<{
    x: number;
    y: number;
    z?: number;
    visibility?: number;
  } | null>;
}

export interface PoseDump {
  exerciseId?: TrajectoryExerciseId;
  fps?: number;
  cameraHint?: "side" | "front";
  label?: string;
  frames: PoseDumpFrame[];
}
