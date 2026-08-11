/**
 * 按样片标准对 PoseDump 时间窗评分并选出候选片段。
 * 标准：docs/exercises/trajectory-pipeline.md §样片标准
 * 复用 core：filterLowConfidenceFrames / smoothPoseSequence / findRepLoops
 */

import {
  extractPhaseConfigFor,
  filterLowConfidenceFrames,
  findRepLoops,
  isArmsDownStand,
  LandmarkIndex,
  pushupElbowAngle,
  smoothPoseSequence,
  squatKneeAngle,
  type PoseDump,
  type RawTrajectoryFrame,
  type TrajectoryExerciseId,
} from "@fitness-coach/core";
import type {
  CameraHint,
  CandidateScoreBreakdown,
  WindowEvaluation,
} from "./types.js";

/**
 * 时长为软偏好，不作硬门禁（短片多 rep / 长片均可入选）。
 * 偏好带内满分；带外只降权，由 rep/入画等决定去留。
 */
export const PREFERRED_CLIP_SEC_MIN = 3;
export const PREFERRED_CLIP_SEC_MAX = 40;
/** 硬下限：过短无法形成循环时仍淘汰（≈1 个极短 rep） */
export const MIN_CLIP_SEC = 1.5;
export const MAX_CLIP_SEC = 120;
/** 至少 2 次完整 stand→bottom→stand */
export const MIN_REPS = 2;
export const MIN_SELECT_SCORE = 0.55;

interface LoopSpan {
  start: number;
  end: number;
}

export interface ScoreOptions {
  exerciseId: TrajectoryExerciseId;
  /** 用户指定机位时不再推断 */
  cameraHint?: CameraHint;
  maxCandidates?: number;
  minScore?: number;
}

function denseOrSparseToPose(
  landmarks: PoseDump["frames"][0]["landmarks"],
): RawTrajectoryFrame["pose"] {
  if (landmarks.length === 0) return [];
  const first = landmarks[0];
  if (first && typeof first === "object" && "i" in first) {
    const pose: RawTrajectoryFrame["pose"] = [];
    for (const lm of landmarks as Array<{
      i: number;
      x: number;
      y: number;
      z?: number;
      v?: number;
    }>) {
      pose[lm.i] = {
        x: lm.x,
        y: lm.y,
        ...(lm.z != null ? { z: lm.z } : {}),
        visibility: lm.v ?? 1,
      };
    }
    return pose;
  }
  const pose: RawTrajectoryFrame["pose"] = [];
  for (let i = 0; i < landmarks.length; i += 1) {
    const lm = landmarks[i] as {
      x: number;
      y: number;
      z?: number;
      visibility?: number;
    } | null;
    if (!lm) continue;
    pose[i] = {
      x: lm.x,
      y: lm.y,
      ...(lm.z != null ? { z: lm.z } : {}),
      ...(lm.visibility != null ? { visibility: lm.visibility } : {}),
    };
  }
  return pose;
}

export function poseDumpToRaw(dump: PoseDump): RawTrajectoryFrame[] {
  const fps = dump.fps ?? 30;
  return dump.frames.map((fr, idx) => ({
    pose: denseOrSparseToPose(fr.landmarks),
    tMs: fr.tMs ?? (idx * 1000) / fps,
  }));
}

export function prepareFrames(dump: PoseDump): {
  smoothed: RawTrajectoryFrame[];
  fps: number;
  durationSec: number;
} {
  const fps = dump.fps && dump.fps > 0 ? dump.fps : 30;
  const raw = poseDumpToRaw(dump);
  const filtered = filterLowConfidenceFrames(raw);
  const smoothed = smoothPoseSequence(filtered);
  const lastMs =
    smoothed[smoothed.length - 1]?.tMs ??
    raw[raw.length - 1]?.tMs ??
    ((Math.max(raw.length, 1) - 1) * 1000) / fps;
  return { smoothed, fps, durationSec: Math.max(0, lastMs / 1000) };
}

function frameTimeSec(
  frames: RawTrajectoryFrame[],
  idx: number,
  fps: number,
): number {
  const t = frames[idx]?.tMs;
  if (t != null) return t / 1000;
  return idx / fps;
}

/** 肩宽相对画面：正面大、侧面小 */
export function inferCameraHint(frames: RawTrajectoryFrame[]): CameraHint {
  if (frames.length === 0) return "side";
  let sum = 0;
  let n = 0;
  const step = Math.max(1, Math.floor(frames.length / 40));
  for (let i = 0; i < frames.length; i += step) {
    const pose = frames[i]!.pose;
    const ls = pose[LandmarkIndex.LeftShoulder];
    const rs = pose[LandmarkIndex.RightShoulder];
    if (!ls || !rs) continue;
    sum += Math.abs(ls.x - rs.x);
    n += 1;
  }
  if (n === 0) return "side";
  const meanWidth = sum / n;
  return meanWidth >= 0.15 ? "front" : "side";
}

function avgVisibility(
  frames: RawTrajectoryFrame[],
  from: number,
  to: number,
): number {
  const keys = [
    LandmarkIndex.LeftShoulder,
    LandmarkIndex.RightShoulder,
    LandmarkIndex.LeftHip,
    LandmarkIndex.RightHip,
    LandmarkIndex.LeftKnee,
    LandmarkIndex.RightKnee,
    LandmarkIndex.LeftAnkle,
    LandmarkIndex.RightAnkle,
  ];
  let sum = 0;
  let n = 0;
  for (let i = from; i <= to; i += 1) {
    const pose = frames[i]?.pose;
    if (!pose) continue;
    for (const k of keys) {
      const lm = pose[k];
      if (!lm) continue;
      sum += lm.visibility ?? 1;
      n += 1;
    }
  }
  return n === 0 ? 0 : sum / n;
}

/** 全身入画：肩+踝可见且坐标大致在 [0.02, 0.98] */
function fullBodyScore(
  frames: RawTrajectoryFrame[],
  from: number,
  to: number,
): number {
  const keys = [
    LandmarkIndex.LeftShoulder,
    LandmarkIndex.RightShoulder,
    LandmarkIndex.LeftAnkle,
    LandmarkIndex.RightAnkle,
  ];
  let ok = 0;
  let total = 0;
  const step = Math.max(1, Math.floor((to - from + 1) / 24));
  for (let i = from; i <= to; i += step) {
    const pose = frames[i]?.pose;
    if (!pose) continue;
    for (const k of keys) {
      total += 1;
      const lm = pose[k];
      if (!lm) continue;
      const v = lm.visibility ?? 1;
      if (
        v >= 0.5 &&
        lm.x >= 0.02 &&
        lm.x <= 0.98 &&
        lm.y >= 0.02 &&
        lm.y <= 0.98
      ) {
        ok += 1;
      }
    }
  }
  return total === 0 ? 0 : ok / total;
}

/**
 * 窗口起止各取约 12% 帧，统计垂臂站立比例。
 * 举手站立会拉低分，避免入库后参考骨「双手上举」畸形。
 */
function armsDownStandScore(
  frames: RawTrajectoryFrame[],
  from: number,
  to: number,
): number {
  const span = Math.max(1, to - from);
  const edge = Math.max(2, Math.floor(span * 0.12));
  const idxs: number[] = [];
  for (let i = from; i <= Math.min(to, from + edge); i += 1) idxs.push(i);
  for (let i = Math.max(from, to - edge); i <= to; i += 1) idxs.push(i);
  let ok = 0;
  let n = 0;
  for (const i of idxs) {
    const pose = frames[i]?.pose;
    if (!pose) continue;
    n += 1;
    if (isArmsDownStand(pose)) ok += 1;
  }
  return n === 0 ? 0 : ok / n;
}

function standEndScore(
  frames: RawTrajectoryFrame[],
  from: number,
  to: number,
  exerciseId: TrajectoryExerciseId,
): number {
  const cfg = extractPhaseConfigFor(exerciseId);
  const angleAt = (idx: number): number | null => {
    const pose = frames[idx]?.pose;
    if (!pose) return null;
    return exerciseId === "pushup"
      ? pushupElbowAngle(pose)
      : squatKneeAngle(pose);
  };
  const a0 = angleAt(from);
  const a1 = angleAt(to);
  if (a0 == null || a1 == null) return 0;
  const thr = cfg.standAboveDeg - 8;
  const s0 = a0 >= thr ? 1 : Math.max(0, a0 / thr);
  const s1 = a1 >= thr ? 1 : Math.max(0, a1 / thr);
  return (s0 + s1) / 2;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function scoreWindow(opts: {
  frames: RawTrajectoryFrame[];
  fps: number;
  from: number;
  to: number;
  loopsInWindow: LoopSpan[];
  exerciseId: TrajectoryExerciseId;
  cameraHint: CameraHint;
  cameraHintSource: "flag" | "inferred";
}): WindowEvaluation {
  const { frames, fps, from, to, loopsInWindow, exerciseId } = opts;
  const startSec = frameTimeSec(frames, from, fps);
  const endSec = frameTimeSec(frames, to, fps);
  const dur = Math.max(0, endSec - startSec);
  const reasons: string[] = [];

  let duration = 0;
  if (dur <= 0) {
    reasons.push("无法计算时长");
  } else if (dur >= PREFERRED_CLIP_SEC_MIN && dur <= PREFERRED_CLIP_SEC_MAX) {
    duration = 1;
  } else if (dur < PREFERRED_CLIP_SEC_MIN) {
    // 短于偏好带：仍可满分偏下，不因「不够 8s」否决
    duration = clamp01(0.55 + 0.45 * (dur / PREFERRED_CLIP_SEC_MIN));
    if (dur < MIN_CLIP_SEC) {
      reasons.push(`时长 ${dur.toFixed(1)}s < ${MIN_CLIP_SEC}s（过短）`);
    }
  } else if (dur <= MAX_CLIP_SEC) {
    duration = clamp01(PREFERRED_CLIP_SEC_MAX / dur) * 0.85 + 0.15;
  } else {
    duration = 0.2;
    reasons.push(`时长 ${dur.toFixed(1)}s > ${MAX_CLIP_SEC}s`);
  }

  const estimatedReps = loopsInWindow.length;
  let reps = 0;
  if (estimatedReps >= MIN_REPS) {
    reps = clamp01(0.7 + 0.1 * Math.min(estimatedReps, 5));
  } else if (estimatedReps === 1) {
    reps = 0.35;
    reasons.push("完整 rep < 2");
  } else {
    reps = 0;
    reasons.push("未检出完整 stand→bottom→stand");
  }

  const standEnds = standEndScore(frames, from, to, exerciseId);
  if (standEnds < 0.6) reasons.push("起止未接近站立相位");

  const armsDownStand = armsDownStandScore(frames, from, to);
  if (armsDownStand < 0.55) {
    reasons.push("站立举手，不宜作参考（腕高于肩）");
  }

  const visibility = avgVisibility(frames, from, to);
  if (visibility < 0.55) reasons.push("关键点 visibility 偏低");

  const fullBody = fullBodyScore(frames, from, to);
  if (fullBody < 0.55) reasons.push("全身入画不足（肩/踝）");

  const camera = 0.85;

  const breakdown: CandidateScoreBreakdown = {
    duration,
    reps,
    standEnds,
    armsDownStand,
    visibility,
    fullBody,
    camera,
  };

  // 权重微调：挤出 armsDownStand，仍合计 1.0
  const score =
    duration * 0.22 +
    reps * 0.28 +
    standEnds * 0.12 +
    armsDownStand * 0.12 +
    visibility * 0.13 +
    fullBody * 0.09 +
    camera * 0.04;

  if (estimatedReps >= MIN_REPS && dur >= MIN_CLIP_SEC && reasons.length === 0) {
    reasons.push("符合样片标准（rep/起止/入画；时长软偏好）");
  }

  return {
    timeRange: {
      startSec: round3(startSec),
      endSec: round3(endSec),
    },
    score: round3(score),
    breakdown,
    estimatedReps,
    cameraHint: opts.cameraHint,
    cameraHintSource: opts.cameraHintSource,
    selected: false,
    reasons,
  };
}

function dedupeWindows(list: WindowEvaluation[]): WindowEvaluation[] {
  const out: WindowEvaluation[] = [];
  for (const ev of list) {
    const dupIdx = out.findIndex(
      (o) =>
        Math.abs(o.timeRange.startSec - ev.timeRange.startSec) < 0.4 &&
        Math.abs(o.timeRange.endSec - ev.timeRange.endSec) < 0.4,
    );
    if (dupIdx < 0) {
      out.push(ev);
      continue;
    }
    if (ev.score > out[dupIdx]!.score) {
      out[dupIdx] = ev;
    }
  }
  return out;
}

/**
 * 基于完整 rep 循环组合时间窗，选出评分最高的候选。
 */
export function selectCandidateWindows(
  dump: PoseDump,
  opts: ScoreOptions,
): {
  durationSec: number;
  cameraHint: CameraHint;
  cameraHintSource: "flag" | "inferred";
  candidates: WindowEvaluation[];
  rejected: WindowEvaluation[];
} {
  const { smoothed, fps, durationSec } = prepareFrames(dump);
  const cameraHintSource: "flag" | "inferred" = opts.cameraHint
    ? "flag"
    : "inferred";
  const cameraHint = opts.cameraHint ?? inferCameraHint(smoothed);

  if (smoothed.length < 8) {
    const rejected: WindowEvaluation[] = [
      {
        timeRange: { startSec: 0, endSec: durationSec },
        score: 0,
        breakdown: {
          duration: 0,
          reps: 0,
          standEnds: 0,
          armsDownStand: 0,
          visibility: 0,
          fullBody: 0,
          camera: 0,
        },
        estimatedReps: 0,
        cameraHint,
        cameraHintSource,
        selected: false,
        reasons: ["有效姿态帧过少"],
      },
    ];
    return {
      durationSec,
      cameraHint,
      cameraHintSource,
      candidates: [],
      rejected,
    };
  }

  const cfg = extractPhaseConfigFor(opts.exerciseId);
  const loops = findRepLoops(smoothed, opts.exerciseId, cfg);
  const evaluated: WindowEvaluation[] = [];

  for (let i = 0; i < loops.length; i += 1) {
    for (let j = i + MIN_REPS - 1; j < loops.length; j += 1) {
      const padFrames = Math.round(fps * 0.4);
      const from = Math.max(0, loops[i]!.start - padFrames);
      const to = Math.min(smoothed.length - 1, loops[j]!.end + padFrames);
      const loopsInWindow = loops.slice(i, j + 1);
      evaluated.push(
        scoreWindow({
          frames: smoothed,
          fps,
          from,
          to,
          loopsInWindow,
          exerciseId: opts.exerciseId,
          cameraHint,
          cameraHintSource,
        }),
      );
    }
  }

  const whole = scoreWindow({
    frames: smoothed,
    fps,
    from: 0,
    to: smoothed.length - 1,
    loopsInWindow: loops,
    exerciseId: opts.exerciseId,
    cameraHint,
    cameraHintSource,
  });
  whole.reasons = [
    ...whole.reasons.filter((r) => !r.startsWith("符合")),
    "全片窗口",
  ];
  evaluated.push(whole);

  const unique = dedupeWindows(evaluated);
  unique.sort((a, b) => b.score - a.score);

  const minScore = opts.minScore ?? MIN_SELECT_SCORE;
  const maxCand = opts.maxCandidates ?? 3;
  const candidates: WindowEvaluation[] = [];
  const rejected: WindowEvaluation[] = [];

  for (const ev of unique) {
    const clipDur = ev.timeRange.endSec - ev.timeRange.startSec;
    // 时长只挡极端过短/过长；8–25s 不再是硬门禁
    const pass =
      ev.estimatedReps >= MIN_REPS &&
      clipDur >= MIN_CLIP_SEC - 0.05 &&
      clipDur <= MAX_CLIP_SEC + 0.05 &&
      ev.score >= minScore;
    if (pass && candidates.length < maxCand) {
      candidates.push({ ...ev, selected: true });
    } else {
      rejected.push({ ...ev, selected: false });
    }
  }

  return { durationSec, cameraHint, cameraHintSource, candidates, rejected };
}
