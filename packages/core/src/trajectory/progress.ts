/**
 * 由用户相位 + 驱动角映射到示范轨迹进度 t∈[0,1]（FR-068）
 */

import {
  DEFAULT_BENCH_PRESS_PHASE_CONFIG,
  DEFAULT_DB_ROW_PHASE_CONFIG,
  DEFAULT_GLUTE_BRIDGE_PHASE_CONFIG,
  DEFAULT_LUNGE_PHASE_CONFIG,
  DEFAULT_OHP_PHASE_CONFIG,
  DEFAULT_PLANK_PHASE_CONFIG,
  DEFAULT_PUSHUP_PHASE_CONFIG,
  DEFAULT_PULLUP_PHASE_CONFIG,
  DEFAULT_DB_FLY_PHASE_CONFIG,
  DEFAULT_DIP_PHASE_CONFIG,
  DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG,
  DEFAULT_CABLE_CROSSOVER_PHASE_CONFIG,
  DEFAULT_CHEST_PRESS_MACHINE_PHASE_CONFIG,
  DEFAULT_LATERAL_RAISE_PHASE_CONFIG,
  DEFAULT_FRONT_RAISE_PHASE_CONFIG,
  DEFAULT_REAR_DELT_FLY_PHASE_CONFIG,
  DEFAULT_FACE_PULL_PHASE_CONFIG,
  DEFAULT_PIKE_PUSHUP_PHASE_CONFIG,
  DEFAULT_RDL_PHASE_CONFIG,
  DEFAULT_SQUAT_PHASE_CONFIG,
  type PhaseConfig,
} from "../phase.js";
import { LandmarkIndex, type Phase, type Pose } from "../types.js";
import { poseFromFrame } from "./serialize.js";
import type { DemoTrajectory, TrajectoryExerciseId } from "./types.js";

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function cfgFor(exerciseId: TrajectoryExerciseId): PhaseConfig {
  if (exerciseId === "pushup") return DEFAULT_PUSHUP_PHASE_CONFIG;
  if (exerciseId === "glute-bridge") return DEFAULT_GLUTE_BRIDGE_PHASE_CONFIG;
  if (exerciseId === "lunge") return DEFAULT_LUNGE_PHASE_CONFIG;
  if (exerciseId === "plank") return DEFAULT_PLANK_PHASE_CONFIG;
  if (exerciseId === "db-row") return DEFAULT_DB_ROW_PHASE_CONFIG;
  if (exerciseId === "ohp") return DEFAULT_OHP_PHASE_CONFIG;
  if (exerciseId === "bench-press") return DEFAULT_BENCH_PRESS_PHASE_CONFIG;
  if (exerciseId === "rdl") return DEFAULT_RDL_PHASE_CONFIG;
  if (exerciseId === "pullup") return DEFAULT_PULLUP_PHASE_CONFIG;
  if (exerciseId === "db-fly") return DEFAULT_DB_FLY_PHASE_CONFIG;
  if (exerciseId === "dip") return DEFAULT_DIP_PHASE_CONFIG;
  if (exerciseId === "incline-pushup") return DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG;
  if (exerciseId === "cable-crossover") {
    return DEFAULT_CABLE_CROSSOVER_PHASE_CONFIG;
  }
  if (exerciseId === "chest-press-machine") {
    return DEFAULT_CHEST_PRESS_MACHINE_PHASE_CONFIG;
  }
  if (exerciseId === "lateral-raise") return DEFAULT_LATERAL_RAISE_PHASE_CONFIG;
  if (exerciseId === "front-raise") return DEFAULT_FRONT_RAISE_PHASE_CONFIG;
  if (exerciseId === "rear-delt-fly") return DEFAULT_REAR_DELT_FLY_PHASE_CONFIG;
  if (exerciseId === "face-pull") return DEFAULT_FACE_PULL_PHASE_CONFIG;
  if (exerciseId === "pike-pushup") return DEFAULT_PIKE_PUSHUP_PHASE_CONFIG;
  return DEFAULT_SQUAT_PHASE_CONFIG;
}

function mid(
  a: { x: number; y: number } | undefined,
  b: { x: number; y: number } | undefined,
): { x: number; y: number } | null {
  if (a && b) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (a) return { x: a.x, y: a.y };
  if (b) return { x: b.x, y: b.y };
  return null;
}

/**
 * 垂臂判定：腕中点 y ≥ 肩中点 y（图像坐标向下为正）。
 * 胸前握持可接受；过头举手返回 false。缺腕时视为未知（true，不硬否决）。
 */
export function isArmsDownStand(pose: Pose): boolean {
  const sh = mid(
    pose[LandmarkIndex.LeftShoulder],
    pose[LandmarkIndex.RightShoulder],
  );
  const wrist = mid(
    pose[LandmarkIndex.LeftWrist],
    pose[LandmarkIndex.RightWrist],
  );
  if (!sh) return false;
  if (!wrist) return true;
  return wrist.y >= sh.y - 0.02;
}

/**
 * 站立参考帧质量：垂臂 + 腿够长 + 未深蹲。
 * 用于避开片源里「举手站立 / 结束举手」帧（正面 v1、侧面 v2 末帧常见）。
 * 正面俯卧撑腿长透视压缩：允许用肩宽 + 支撑臂长代替髋–踝。
 */
export function scoreStandPose(pose: Pose): number {
  const ls = pose[LandmarkIndex.LeftShoulder];
  const rs = pose[LandmarkIndex.RightShoulder];
  const sh = mid(ls, rs);
  const hip = mid(pose[LandmarkIndex.LeftHip], pose[LandmarkIndex.RightHip]);
  const ankle = mid(
    pose[LandmarkIndex.LeftAnkle],
    pose[LandmarkIndex.RightAnkle],
  );
  if (!sh || !hip) return -1e9;
  const torso = Math.hypot(hip.x - sh.x, hip.y - sh.y);
  if (torso < 0.04) return -1e9;

  let leg = ankle
    ? Math.hypot(ankle.x - hip.x, ankle.y - hip.y)
    : 0;
  const lw = pose[LandmarkIndex.LeftWrist];
  const rw = pose[LandmarkIndex.RightWrist];
  const wrist = mid(lw, rw);
  const shoulderWidth =
    ls && rs ? Math.abs(ls.x - rs.x) : 0;
  const support = wrist
    ? Math.hypot(wrist.x - sh.x, wrist.y - sh.y)
    : 0;

  // 正面俯卧撑：髋–踝投影很短，改用支撑臂 + 肩宽
  if (leg < 0.12) {
    const frontPlank =
      shoulderWidth >= 0.12 &&
      support >= 0.08 &&
      wrist != null &&
      wrist.y >= sh.y - 0.02;
    if (!frontPlank) return -1e9;
    leg = Math.max(support, shoulderWidth * 0.8);
  }

  // 腕在肩下方 → 垂臂；举手重罚（图1/图2 畸形主因）
  let arms = 0;
  if (wrist) {
    const dy = wrist.y - sh.y;
    arms = dy >= 0.02 ? 3 + Math.min(0.2, dy) * 5 : -4 + dy * 8;
  } else {
    arms = 0.5; // 缺腕不奖不重罚
  }

  return arms + Math.min(leg, 0.45) * 4 + Math.min(torso, 0.28) * 2;
}

export type CanonicalStandQuality = {
  ok: boolean;
  t: number;
  reason?: string;
};

/**
 * 校验轨迹 canonical 站立帧是否适合做参考骨（垂臂 + 可评分）。
 * 新动作入库前必跑；举手 stand 应失败。
 */
export function checkCanonicalStandQuality(
  trajectory: DemoTrajectory,
): CanonicalStandQuality {
  if (trajectory.frames.length === 0) {
    return { ok: false, t: 0, reason: "empty trajectory" };
  }
  const t = standProgressOf(trajectory);
  const frame =
    trajectory.frames.reduce((best, f) =>
      Math.abs(f.t - t) < Math.abs(best.t - t) ? f : best,
    ) ?? trajectory.frames[0]!;
  const pose = poseFromFrame(frame);
  if (scoreStandPose(pose) < -1e8) {
    return {
      ok: false,
      t,
      reason: "canonical stand 缺肩/髋/踝或腿长不足",
    };
  }
  if (!isArmsDownStand(pose)) {
    return {
      ok: false,
      t,
      reason:
        "canonical stand 举手（腕高于肩）；勿用片尾庆祝/过头手势帧作站立参考",
    };
  }
  return { ok: true, t };
}

/** 不通过则抛错（提取/入库门禁）。 */
export function assertCanonicalStandQuality(
  trajectory: DemoTrajectory,
): void {
  const q = checkCanonicalStandQuality(trajectory);
  if (!q.ok) {
    throw new Error(
      `assertCanonicalStandQuality(${trajectory.id}): ${q.reason} (t=${q.t.toFixed(3)})`,
    );
  }
}

/**
 * stand→稳定站立帧；bottom→0.5；descend/ascend 按驱动角线性插值。
 * 粗映射；优先用 progressByNearestDrive。
 */
export function progressFromPhaseDrive(
  phase: Phase,
  driveDeg: number | null,
  exerciseId: TrajectoryExerciseId = "squat",
  cfg?: PhaseConfig,
): number {
  const c = cfg ?? cfgFor(exerciseId);
  const span = c.standAboveDeg - c.bottomBelowDeg || 1;

  switch (phase) {
    case "stand":
      return 0;
    case "bottom":
      return 0.5;
    case "descend": {
      if (driveDeg == null) return 0.25;
      const u = clamp01((c.standAboveDeg - driveDeg) / span);
      return u * 0.5;
    }
    case "ascend": {
      if (driveDeg == null) return 0.75;
      const u = clamp01((driveDeg - c.bottomBelowDeg) / span);
      return 0.5 + u * 0.5;
    }
    default:
      return 0;
  }
}

/**
 * 轨迹中用于体型对齐 / 站立参考的进度。
 * 在全体帧中选「垂臂 + 直立」最优帧，避免末帧举手站立。
 */
export function standProgressOf(trajectory: DemoTrajectory): number {
  const frames = trajectory.frames;
  if (frames.length === 0) return 0;

  let bestT = frames[0]!.t;
  let bestScore = -1e9;

  for (const f of frames) {
    // 深蹲帧不当站立参考
    if (f.phase === "bottom") continue;
    // 深蹲/俯卧撑：过低驱动角不是站立参考。臀桥驱动角本身 <120。
    if (
      trajectory.exerciseId !== "glute-bridge" &&
      f.driveDeg != null &&
      f.driveDeg < 120
    ) {
      continue;
    }
    const pose = poseFromFrame(f);
    let score = scoreStandPose(pose);
    if (f.phase === "stand") score += 0.8;
    // 略偏好轨迹前段（片头常为自然站立）
    score += (1 - f.t) * 0.15;
    if (score > bestScore) {
      bestScore = score;
      bestT = f.t;
    }
  }
  return bestT;
}

/**
 * 按驱动角在轨迹上找最近帧（同相位优先），避免「人已蹲下、参考仍站立」。
 *
 * 站立相位固定取 canonical 垂臂站立帧。
 */
export function progressByNearestDrive(
  trajectory: DemoTrajectory,
  phase: Phase,
  driveDeg: number | null,
): number {
  const frames = trajectory.frames;
  if (frames.length === 0) return 0;

  if (phase === "stand") {
    return standProgressOf(trajectory);
  }

  if (driveDeg == null) {
    return progressFromPhaseDrive(phase, null, trajectory.exerciseId);
  }

  let bestT = frames[0]!.t;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const f of frames) {
    if (f.driveDeg == null) continue;
    let score = Math.abs(f.driveDeg - driveDeg);
    if (phase === "ascend" && f.t < 0.45) score += 25;
    if (phase === "descend" && f.t > 0.55) score += 25;
    if (phase === "bottom" && Math.abs(f.t - 0.5) > 0.25) score += 12;
    if (f.phase === "stand") score += 50;
    // 行程中避开举手帧（腕远高于肩），减少参考骨「举手畸形态」
    const pose = poseFromFrame(f);
    const sh = mid(
      pose[LandmarkIndex.LeftShoulder],
      pose[LandmarkIndex.RightShoulder],
    );
    const wrist = mid(
      pose[LandmarkIndex.LeftWrist],
      pose[LandmarkIndex.RightWrist],
    );
    if (sh && wrist && wrist.y < sh.y - 0.04) score += 20;
    if (f.phase != null && f.phase !== phase) score += 6;
    if (score < bestScore) {
      bestScore = score;
      bestT = f.t;
    }
  }
  return bestT;
}
