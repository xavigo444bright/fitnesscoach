/** 示范片源 ingest 报告与评分类型（FR-067 片源侧） */

export type ExerciseId = string;
/** Pose 提取与轨迹 meta：只有正/侧。 */
export type CameraHint = "side" | "front";
/** Scout 片源机位；3/4 提取时映射为 side。 */
export type ScoutCamera = CameraHint | "three_quarter";

export interface Provenance {
  sourceUrl: string;
  /** 本地输入时为 absolute path；URL 下载时为 inbox 路径 */
  localPath?: string;
  fetchedAt: string;
  toolName: string;
  toolVersion: string;
  ytDlpVersion?: string | null;
  ffmpegVersion?: string | null;
  poseScript?: string | null;
  note?: string;
  licenseNote?: string;
  /** ASSET-SCOUT 条目 id（ingest 必填） */
  scoutId?: string;
}

export interface TimeRangeSec {
  startSec: number;
  endSec: number;
}

export interface CandidateScoreBreakdown {
  duration: number;
  reps: number;
  standEnds: number;
  /** 起止附近垂臂站立比例（举手站立不宜作参考） */
  armsDownStand: number;
  visibility: number;
  fullBody: number;
  camera: number;
}

export interface WindowEvaluation {
  timeRange: TimeRangeSec;
  score: number;
  breakdown: CandidateScoreBreakdown;
  estimatedReps: number;
  cameraHint: CameraHint;
  cameraHintSource: "flag" | "inferred";
  selected: boolean;
  reasons: string[];
  outputMp4?: string;
}

export interface IngestReport {
  schemaVersion: "1.0";
  exerciseId: ExerciseId;
  provenance: Provenance;
  cameraHint: CameraHint;
  cameraHintSource: "flag" | "inferred";
  videoDurationSec: number;
  poseDumpPath?: string;
  candidates: WindowEvaluation[];
  rejected: WindowEvaluation[];
  /** 默认不写正式轨迹 JSON；本字段仅提示后续人工步骤 */
  nextStepHint: string;
}
