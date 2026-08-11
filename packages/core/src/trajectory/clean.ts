/**
 * 轨迹清洗与单 rep 循环裁剪（FR-067）
 */

import {
  DEFAULT_PUSHUP_PHASE_CONFIG,
  DEFAULT_SQUAT_PHASE_CONFIG,
  initialPhaseState,
  pushupElbowAngle,
  squatKneeAngle,
  stepPhaseWithAngle,
  type PhaseConfig,
} from "../phase.js";
import type { Phase, Pose } from "../types.js";
import { assertCanonicalStandQuality } from "./progress.js";
import {
  landmarksFromPose,
  poseFromFrame,
  poseFromLandmarks,
} from "./serialize.js";
import type {
  DemoTrajectory,
  PoseDump,
  TrajectoryExerciseId,
  TrajectoryFrame,
  TrajectoryLandmark,
  TrajectoryMeta,
  TrajectorySource,
} from "./types.js";
import { TRAJECTORY_SCHEMA_VERSION } from "./types.js";

const MIN_VISIBILITY = 0.5;
/** 单循环至少需要的帧数（过短则拒绝） */
const MIN_LOOP_FRAMES = 8;

export interface RawTrajectoryFrame {
  pose: Pose;
  tMs?: number;
}

export interface ExtractLoopOptions {
  exerciseId: TrajectoryExerciseId;
  id: string;
  source: TrajectorySource;
  meta?: Partial<TrajectoryMeta>;
  phaseConfig?: PhaseConfig;
  /** 选取第几个完整 stand→…→stand 循环（0-based）；默认取最长的一个 */
  preferRepIndex?: number;
}

function driveAngle(
  exerciseId: TrajectoryExerciseId,
  pose: Pose,
): number | null {
  return exerciseId === "pushup"
    ? pushupElbowAngle(pose)
    : squatKneeAngle(pose);
}

function phaseConfigFor(exerciseId: TrajectoryExerciseId): PhaseConfig {
  return exerciseId === "pushup"
    ? DEFAULT_PUSHUP_PHASE_CONFIG
    : DEFAULT_SQUAT_PHASE_CONFIG;
}

/** 离线提取：确认帧放宽，避免示范片尾刚站直却裁不出循环 */
export function extractPhaseConfigFor(
  exerciseId: TrajectoryExerciseId,
): PhaseConfig {
  const base = phaseConfigFor(exerciseId);
  return { ...base, confirmFrames: 2 };
}

/** 丢弃关键点整体置信度过低的帧；单点 visibility < 阈值则剔除该点。 */
export function filterLowConfidenceFrames(
  frames: RawTrajectoryFrame[],
  minVisibility = MIN_VISIBILITY,
): RawTrajectoryFrame[] {
  const out: RawTrajectoryFrame[] = [];
  for (const fr of frames) {
    const pose: Pose = [];
    let visible = 0;
    let total = 0;
    for (let i = 0; i < fr.pose.length; i += 1) {
      const lm = fr.pose[i];
      if (!lm) continue;
      total += 1;
      const v = lm.visibility ?? 1;
      if (v < minVisibility) continue;
      pose[i] = { ...lm, visibility: v };
      visible += 1;
    }
    if (total === 0 || visible / total < 0.4) continue;
    out.push({ pose, tMs: fr.tMs });
  }
  return out;
}

/**
 * 对每个关键点做 1D 三点滑动均值（轻平滑，防抖但不糊相位）。
 */
export function smoothPoseSequence(
  frames: RawTrajectoryFrame[],
): RawTrajectoryFrame[] {
  if (frames.length < 3) return frames.map((f) => ({ ...f, pose: [...f.pose] }));
  const n = frames.length;
  const out: RawTrajectoryFrame[] = [];
  for (let fi = 0; fi < n; fi += 1) {
    const prev = frames[Math.max(0, fi - 1)]!.pose;
    const cur = frames[fi]!.pose;
    const next = frames[Math.min(n - 1, fi + 1)]!.pose;
    const maxLen = Math.max(prev.length, cur.length, next.length);
    const pose: Pose = [];
    for (let i = 0; i < maxLen; i += 1) {
      const a = prev[i];
      const b = cur[i];
      const c = next[i];
      if (!b) continue;
      if (!a || !c) {
        pose[i] = { ...b };
        continue;
      }
      pose[i] = {
        x: (a.x + b.x + c.x) / 3,
        y: (a.y + b.y + c.y) / 3,
        z:
          a.z != null || b.z != null || c.z != null
            ? ((a.z ?? 0) + (b.z ?? 0) + (c.z ?? 0)) / 3
            : undefined,
        visibility: b.visibility,
      };
    }
    out.push({ pose, tMs: frames[fi]!.tMs });
  }
  return out;
}

interface LoopSpan {
  start: number;
  end: number; // inclusive index of return-to-stand
}

/**
 * 用相位机找出完整循环（须经过 bottom，并回到 stand）。
 * 支持真视频从中段起录（开局已是 descend/bottom）。
 */
export function findRepLoops(
  frames: RawTrajectoryFrame[],
  exerciseId: TrajectoryExerciseId,
  cfg?: PhaseConfig,
): LoopSpan[] {
  const phaseCfg = cfg ?? phaseConfigFor(exerciseId);
  let state = initialPhaseState();
  const loops: LoopSpan[] = [];
  let cycleStart: number | null = null;
  let sawBottom = false;
  let prevPhase: Phase = state.phase;
  let openedFromMid = false;

  for (let i = 0; i < frames.length; i += 1) {
    const angle = driveAngle(exerciseId, frames[i]!.pose);
    state = stepPhaseWithAngle(state, angle, phaseCfg).state;
    const phase = state.phase;

    if (cycleStart == null) {
      if (prevPhase === "stand" && phase === "descend") {
        cycleStart = i > 0 ? i - 1 : i;
        sawBottom = false;
        openedFromMid = false;
      } else if (
        !openedFromMid &&
        i === 0 &&
        (phase === "descend" || phase === "bottom")
      ) {
        // 首帧已在下行：允许从 0 起算半段 + 回 stand
        cycleStart = 0;
        sawBottom = phase === "bottom";
        openedFromMid = true;
      } else if (
        !openedFromMid &&
        cycleStart == null &&
        prevPhase === "descend" &&
        phase === "bottom" &&
        loops.length === 0
      ) {
        // 开局若干帧后才确认到 bottom：回溯到序列起点
        cycleStart = 0;
        sawBottom = true;
        openedFromMid = true;
      }
    }

    if (phase === "bottom") sawBottom = true;
    if (
      cycleStart != null &&
      sawBottom &&
      prevPhase === "ascend" &&
      phase === "stand"
    ) {
      loops.push({ start: cycleStart, end: i });
      cycleStart = null;
      sawBottom = false;
    }
    prevPhase = phase;
  }

  // 片尾已接近站立、状态机尚未确认 stand 时仍收束一圈
  if (cycleStart != null && sawBottom && frames.length > 0) {
    const last = frames.length - 1;
    const lastAngle = driveAngle(exerciseId, frames[last]!.pose);
    if (
      lastAngle != null &&
      lastAngle >= phaseCfg.standAboveDeg - 5 &&
      (prevPhase === "ascend" || prevPhase === "stand")
    ) {
      loops.push({ start: cycleStart, end: last });
    }
  }
  return loops;
}

function pickLoop(
  loops: LoopSpan[],
  preferRepIndex?: number,
): LoopSpan | null {
  if (loops.length === 0) return null;
  if (
    preferRepIndex != null &&
    preferRepIndex >= 0 &&
    preferRepIndex < loops.length
  ) {
    return loops[preferRepIndex]!;
  }
  return loops.reduce((best, cur) =>
    cur.end - cur.start > best.end - best.start ? cur : best,
  );
}

/** 将循环帧归一化为 t∈[0,1]，并标注 phase / driveDeg。 */
export function normalizeLoopFrames(
  frames: RawTrajectoryFrame[],
  exerciseId: TrajectoryExerciseId,
  cfg?: PhaseConfig,
): TrajectoryFrame[] {
  const phaseCfg = cfg ?? phaseConfigFor(exerciseId);
  let state = initialPhaseState();
  const n = frames.length;
  if (n === 0) return [];
  const out: TrajectoryFrame[] = [];
  for (let i = 0; i < n; i += 1) {
    const pose = frames[i]!.pose;
    const driveDeg = driveAngle(exerciseId, pose) ?? undefined;
    state = stepPhaseWithAngle(state, driveDeg ?? null, phaseCfg).state;
    out.push({
      t: n === 1 ? 0 : i / (n - 1),
      phase: state.phase,
      driveDeg,
      landmarks: landmarksFromPose(pose),
    });
  }
  // 保证首尾 t 闭合语义：末帧 t=1
  if (out.length > 0) {
    out[0]!.t = 0;
    out[out.length - 1]!.t = 1;
  }
  return out;
}

/**
 * 片源只到最低点未起身时：下行段 + 时间反转作上行，拼成可用单循环。
 */
export function reconstructLoopFromPartial(
  frames: RawTrajectoryFrame[],
  exerciseId: TrajectoryExerciseId,
): RawTrajectoryFrame[] | null {
  if (frames.length < MIN_LOOP_FRAMES) return null;
  let minI = -1;
  let minA = Number.POSITIVE_INFINITY;
  for (let i = 0; i < frames.length; i += 1) {
    const a = driveAngle(exerciseId, frames[i]!.pose);
    if (a != null && a < minA) {
      minA = a;
      minI = i;
    }
  }
  // 未明显下到接近 bottom 区则放弃
  const cfg = extractPhaseConfigFor(exerciseId);
  if (minI < 2 || minA > cfg.bottomBelowDeg) return null;
  const down = frames.slice(0, minI + 1);
  const up = down.slice(0, -1).reverse();
  const merged = [...down, ...up];
  return merged.length >= MIN_LOOP_FRAMES ? merged : null;
}

/**
 * 从原始姿态序列提取一条清洗后的单 rep 示范轨迹。
 */
export function extractDemoTrajectory(
  raw: RawTrajectoryFrame[],
  opts: ExtractLoopOptions,
): DemoTrajectory {
  const filtered = filterLowConfidenceFrames(raw);
  const smoothed = smoothPoseSequence(filtered);
  const cfg = opts.phaseConfig ?? extractPhaseConfigFor(opts.exerciseId);
  const loops = findRepLoops(smoothed, opts.exerciseId, cfg);
  const loop = pickLoop(loops, opts.preferRepIndex);

  let slice: RawTrajectoryFrame[];
  let loopFrameRange: [number, number];
  let notes = opts.meta?.notes;

  if (loop && loop.end - loop.start + 1 >= MIN_LOOP_FRAMES) {
    slice = smoothed.slice(loop.start, loop.end + 1);
    loopFrameRange = [loop.start, loop.end];
  } else {
    const rebuilt = reconstructLoopFromPartial(smoothed, opts.exerciseId);
    if (!rebuilt) {
      throw new Error(
        `extractDemoTrajectory: no usable rep loop for ${opts.exerciseId} ` +
          `(loops=${loops.length}, frames=${smoothed.length})`,
      );
    }
    slice = rebuilt;
    loopFrameRange = [0, smoothed.length - 1];
    notes = [notes, "partial-rep: mirrored ascent from deepest frame"]
      .filter(Boolean)
      .join("; ");
  }

  const frames = normalizeLoopFrames(slice, opts.exerciseId, cfg);
  return {
    schemaVersion: TRAJECTORY_SCHEMA_VERSION,
    id: opts.id,
    exerciseId: opts.exerciseId,
    source: opts.source,
    meta: {
      landmarkScheme: "mediapipe33",
      cameraHint: opts.meta?.cameraHint ?? "side",
      rawFrameCount: raw.length,
      loopFrameRange,
      createdAt: opts.meta?.createdAt ?? new Date().toISOString(),
      notes,
    },
    frames,
  };
}

function denseOrSparseToPose(
  landmarks: PoseDump["frames"][0]["landmarks"],
): Pose {
  if (landmarks.length === 0) return [];
  const first = landmarks[0];
  if (first && typeof first === "object" && "i" in first) {
    return poseFromLandmarks(landmarks as TrajectoryLandmark[]);
  }
  const pose: Pose = [];
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

/** PoseDump → DemoTrajectory（视频离线估计后的主入口）。 */
export function extractFromPoseDump(
  dump: PoseDump,
  opts: {
    exerciseId: TrajectoryExerciseId;
    id: string;
    preferRepIndex?: number;
    notes?: string;
    /** 默认 true：canonical 站立举手则抛错（防参考骨畸形入库） */
    assertStandQuality?: boolean;
  },
): DemoTrajectory {
  const fps = dump.fps ?? 30;
  const raw: RawTrajectoryFrame[] = dump.frames.map((fr, idx) => ({
    pose: denseOrSparseToPose(fr.landmarks),
    tMs: fr.tMs ?? (idx * 1000) / fps,
  }));
  const traj = extractDemoTrajectory(raw, {
    exerciseId: opts.exerciseId,
    id: opts.id,
    preferRepIndex: opts.preferRepIndex,
    source: {
      type: dump.label?.startsWith("synthetic")
        ? "synthetic"
        : dump.label?.endsWith(".mp4") || dump.label?.endsWith(".mov")
          ? "video"
          : "pose_dump",
      label: dump.label,
      fps,
    },
    meta: {
      cameraHint: dump.cameraHint ?? "side",
      notes: opts.notes,
    },
  });
  if (opts.assertStandQuality !== false) {
    assertCanonicalStandQuality(traj);
  }
  return traj;
}

/** 按归一化进度取样（线性插值相邻帧），供 T7-2 预留。 */
export function sampleTrajectoryAt(
  trajectory: DemoTrajectory,
  t: number,
): TrajectoryFrame {
  const frames = trajectory.frames;
  if (frames.length === 0) {
    throw new Error("sampleTrajectoryAt: empty trajectory");
  }
  const tt = Math.min(1, Math.max(0, t));
  if (frames.length === 1) return { ...frames[0]!, t: tt };

  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid]!.t <= tt) lo = mid;
    else hi = mid;
  }
  const a = frames[lo]!;
  const b = frames[hi]!;
  const span = b.t - a.t || 1;
  const u = (tt - a.t) / span;
  if (u <= 0) return { ...a, t: tt };
  if (u >= 1) return { ...b, t: tt };

  const poseA = poseFromFrame(a);
  const poseB = poseFromFrame(b);
  const maxLen = Math.max(poseA.length, poseB.length);
  const landmarks: TrajectoryLandmark[] = [];
  for (let i = 0; i < maxLen; i += 1) {
    const pa = poseA[i];
    const pb = poseB[i];
    if (!pa && !pb) continue;
    if (!pa) {
      landmarks.push({
        i,
        x: pb!.x,
        y: pb!.y,
        ...(pb!.z != null ? { z: pb!.z } : {}),
        ...(pb!.visibility != null ? { v: pb!.visibility } : {}),
      });
      continue;
    }
    if (!pb) {
      landmarks.push({
        i,
        x: pa.x,
        y: pa.y,
        ...(pa.z != null ? { z: pa.z } : {}),
        ...(pa.visibility != null ? { v: pa.visibility } : {}),
      });
      continue;
    }
    landmarks.push({
      i,
      x: pa.x + (pb.x - pa.x) * u,
      y: pa.y + (pb.y - pa.y) * u,
      ...(pa.z != null || pb.z != null
        ? { z: (pa.z ?? 0) + ((pb.z ?? 0) - (pa.z ?? 0)) * u }
        : {}),
      v:
        pa.visibility != null || pb.visibility != null
          ? (pa.visibility ?? 1) +
            ((pb.visibility ?? 1) - (pa.visibility ?? 1)) * u
          : undefined,
    });
  }
  return {
    t: tt,
    phase: u < 0.5 ? a.phase : b.phase,
    driveDeg:
      a.driveDeg != null && b.driveDeg != null
        ? a.driveDeg + (b.driveDeg - a.driveDeg) * u
        : (a.driveDeg ?? b.driveDeg),
    landmarks,
  };
}
