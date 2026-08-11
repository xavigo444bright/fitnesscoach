/**
 * 示范轨迹 → 相位阈值提议（T7-3 / FR-069）
 *
 * 只统计与提议，不自动覆盖运行时阈值；改参须走 RULE-BOUNDARY。
 */

import {
  DEFAULT_PUSHUP_PHASE_CONFIG,
  DEFAULT_SQUAT_PHASE_CONFIG,
  type PhaseConfig,
} from "../phase.js";
import type { DemoTrajectory, TrajectoryExerciseId } from "./types.js";

export type DriveDegBandStats = {
  count: number;
  min: number;
  max: number;
  p10: number;
  p50: number;
  p90: number;
};

export type DriveDegStats = {
  exerciseId: TrajectoryExerciseId;
  trajectoryId: string;
  all: DriveDegBandStats;
  standBand: DriveDegBandStats;
  bottomBand: DriveDegBandStats;
};

export type ProposedPhaseThresholds = {
  exerciseId: TrajectoryExerciseId;
  standAboveDeg: number;
  bottomBelowDeg: number;
  current: Pick<PhaseConfig, "standAboveDeg" | "bottomBelowDeg">;
  /** 与当前默认的绝对差 */
  deltaStand: number;
  deltaBottom: number;
  /** |delta| ≥ 此值才建议改参 */
  significant: boolean;
  notes: string[];
};

const SIGNIFICANT_DEG = 5;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0]!;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const t = idx - lo;
  return sorted[lo]! * (1 - t) + sorted[hi]! * t;
}

function bandStats(values: number[]): DriveDegBandStats {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { count: 0, min: NaN, max: NaN, p10: NaN, p50: NaN, p90: NaN };
  }
  return {
    count: sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
  };
}

function collectDriveDegs(
  traj: DemoTrajectory,
  pred: (f: DemoTrajectory["frames"][0]) => boolean,
): number[] {
  const out: number[] = [];
  for (const f of traj.frames) {
    if (f.driveDeg == null || !Number.isFinite(f.driveDeg)) continue;
    if (!pred(f)) continue;
    out.push(f.driveDeg);
  }
  return out;
}

/** 统计轨迹 driveDeg 分布（全体 / 站立带 / 底部带）。 */
export function driveDegStats(trajectory: DemoTrajectory): DriveDegStats {
  const all = collectDriveDegs(trajectory, () => true);
  const standBand = collectDriveDegs(
    trajectory,
    (f) =>
      f.phase === "stand" ||
      (f.driveDeg != null && f.driveDeg >= 150),
  );
  const bottomBand = collectDriveDegs(
    trajectory,
    (f) =>
      f.phase === "bottom" ||
      (f.driveDeg != null && f.driveDeg <= 110),
  );
  return {
    exerciseId: trajectory.exerciseId,
    trajectoryId: trajectory.id,
    all: bandStats(all),
    standBand: bandStats(standBand),
    bottomBand: bandStats(bottomBand),
  };
}

function currentConfig(
  exerciseId: TrajectoryExerciseId,
): Pick<PhaseConfig, "standAboveDeg" | "bottomBelowDeg"> {
  const c =
    exerciseId === "pushup"
      ? DEFAULT_PUSHUP_PHASE_CONFIG
      : DEFAULT_SQUAT_PHASE_CONFIG;
  return {
    standAboveDeg: c.standAboveDeg,
    bottomBelowDeg: c.bottomBelowDeg,
  };
}

/**
 * 由分位提议相位阈值（加安全边距）。
 * - standAbove：站立带 p10 附近，略低于示范高位，便于进入 stand
 * - bottomBelow：底部带 p90 附近，略高于示范最低，便于确认 bottom
 */
export function proposePhaseThresholds(
  stats: DriveDegStats,
  exerciseId: TrajectoryExerciseId = stats.exerciseId,
): ProposedPhaseThresholds {
  const current = currentConfig(exerciseId);
  const notes: string[] = [];

  let standAboveDeg = current.standAboveDeg;
  let bottomBelowDeg = current.bottomBelowDeg;

  if (stats.standBand.count >= 3 && Number.isFinite(stats.standBand.p10)) {
    // 站立确认略低于示范高位 p10，夹在合理带
    const proposed = Math.round(stats.standBand.p10 - 3);
    standAboveDeg = Math.min(175, Math.max(145, proposed));
    notes.push(
      `standBand n=${stats.standBand.count} p10=${stats.standBand.p10.toFixed(1)} → standAbove=${standAboveDeg}`,
    );
  } else {
    notes.push("standBand 样本不足，保留当前 standAboveDeg");
  }

  if (stats.bottomBand.count >= 3 && Number.isFinite(stats.bottomBand.p90)) {
    const floor = exerciseId === "pushup" ? 95 : 85;
    const ceil = exerciseId === "pushup" ? 135 : 120;
    const proposed = Math.round(stats.bottomBand.p90 + 5);
    bottomBelowDeg = Math.min(ceil, Math.max(floor, proposed));
    notes.push(
      `bottomBand n=${stats.bottomBand.count} p90=${stats.bottomBand.p90.toFixed(1)} → bottomBelow=${bottomBelowDeg}`,
    );
  } else {
    notes.push("bottomBand 样本不足，保留当前 bottomBelowDeg");
  }

  if (standAboveDeg <= bottomBelowDeg + 20) {
    notes.push("提议间距过窄，回退为当前阈值");
    standAboveDeg = current.standAboveDeg;
    bottomBelowDeg = current.bottomBelowDeg;
  }

  const deltaStand = standAboveDeg - current.standAboveDeg;
  const deltaBottom = bottomBelowDeg - current.bottomBelowDeg;
  const significant =
    Math.abs(deltaStand) >= SIGNIFICANT_DEG ||
    Math.abs(deltaBottom) >= SIGNIFICANT_DEG;

  if (!significant) {
    notes.push(
      `与现状差 < ${SIGNIFICANT_DEG}°，建议不改参（轨迹支持当前阈值）`,
    );
  } else {
    notes.push(
      `显著偏差：Δstand=${deltaStand}, Δbottom=${deltaBottom}；改参须同步 rules + matrix/sweep`,
    );
  }

  return {
    exerciseId,
    standAboveDeg,
    bottomBelowDeg,
    current,
    deltaStand,
    deltaBottom,
    significant,
    notes,
  };
}
