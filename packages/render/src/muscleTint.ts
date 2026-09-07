/**
 * 示范窗骨骼模式的简化肌群强调（FR-085 / T9-3）。
 * 主动肌表在 core catalog；本文件只做近侧过滤与绘制倍率。禁止相位/计数。
 */

import {
  LandmarkIndex,
  landmarkInFrame,
  activeMusclesForExercise,
  type Pose,
} from "@fitness-coach/core";
import type { CameraHint } from "./cameraHint.js";
import type { Rig3dVolume, Rig3dVolumeKind } from "./rig3d.js";

export type MuscleEmphasis = "active" | "rest";
export type LimbLaterality = "left" | "right" | "mid";
export type NearLimbSide = "left" | "right" | "both";

export type PipVolumePaint = {
  volume: Rig3dVolume;
  emphasis: MuscleEmphasis;
  /** 相对体积 rx/ry 的绘制倍率（主动肌缩小，避免盖住绿骨） */
  scale: number;
};

const LEFT_LANDMARKS = [
  LandmarkIndex.LeftShoulder,
  LandmarkIndex.LeftHip,
  LandmarkIndex.LeftKnee,
  LandmarkIndex.LeftAnkle,
] as const;
const RIGHT_LANDMARKS = [
  LandmarkIndex.RightShoulder,
  LandmarkIndex.RightHip,
  LandmarkIndex.RightKnee,
  LandmarkIndex.RightAnkle,
] as const;

export function activeMuscleKinds(
  exerciseId: string,
): ReadonlySet<Rig3dVolumeKind> {
  return new Set<Rig3dVolumeKind>(activeMusclesForExercise(exerciseId));
}

export function muscleEmphasisFor(
  kind: Rig3dVolumeKind,
  exerciseId: string,
): MuscleEmphasis {
  return activeMuscleKinds(exerciseId).has(kind) ? "active" : "rest";
}

export function limbLateralityFromVolumeId(id: string): LimbLaterality {
  if (id.endsWith("-l")) return "left";
  if (id.endsWith("-r")) return "right";
  return "mid";
}

function sideVisibility(pose: Pose, indexes: readonly number[]): number {
  let sum = 0;
  let n = 0;
  for (const i of indexes) {
    const lm = pose[i];
    if (!lm) continue;
    sum += lm.visibility ?? 0.5;
    n += 1;
  }
  return n > 0 ? sum / n : 0;
}

function armClarity(pose: Pose, side: "left" | "right"): number {
  const shoulder =
    pose[
      side === "left" ? LandmarkIndex.LeftShoulder : LandmarkIndex.RightShoulder
    ];
  const elbow =
    pose[side === "left" ? LandmarkIndex.LeftElbow : LandmarkIndex.RightElbow];
  const wrist =
    pose[side === "left" ? LandmarkIndex.LeftWrist : LandmarkIndex.RightWrist];
  let score = 0;
  for (const lm of [elbow, wrist]) {
    if (!lm) continue;
    const vis = lm.visibility ?? 0.5;
    if (vis < 0.2) continue;
    score += landmarkInFrame(lm) ? vis : vis * 0.3;
    if (shoulder) {
      score += Math.hypot(lm.x - shoulder.x, lm.y - shoulder.y);
    }
  }
  return score;
}

/** 侧面只强调近镜头一侧肢体，避免左右大腿叠成一团。正面两侧都画。
 *  手臂清晰度优先于躯干可见度，避免近景把工作臂当成远侧丢掉。
 */
export function inferNearLimbSide(
  pose: Pose,
  cameraHint: CameraHint,
): NearLimbSide {
  if (cameraHint === "front") return "both";
  const leftArm = armClarity(pose, "left");
  const rightArm = armClarity(pose, "right");
  if (Math.abs(leftArm - rightArm) >= 0.12) {
    return leftArm > rightArm ? "left" : "right";
  }
  const left = sideVisibility(pose, LEFT_LANDMARKS);
  const right = sideVisibility(pose, RIGHT_LANDMARKS);
  if (right > left + 0.04) return "right";
  return "left";
}

export function pipPaintScale(kind: Rig3dVolumeKind, emphasis: MuscleEmphasis): number {
  if (emphasis === "active") {
    if (kind === "chest" || kind === "pelvis") return 0.42;
    return 0.5;
  }
  return 0.62;
}

export function keepVolumeForPip(
  vol: Rig3dVolume,
  nearSide: NearLimbSide,
): boolean {
  if (nearSide === "both") return true;
  const side = limbLateralityFromVolumeId(vol.id);
  return side === "mid" || side === nearSide;
}

/** 浅灰人体底 + 近侧主动肌；先 rest 后 active。 */
export function pipVolumesToPaint(
  volumes: readonly Rig3dVolume[],
  opts: {
    exerciseId: string;
    cameraHint: CameraHint;
    pose: Pose;
  },
): PipVolumePaint[] {
  const near = inferNearLimbSide(opts.pose, opts.cameraHint);
  const painted: PipVolumePaint[] = [];
  for (const volume of volumes) {
    if (!keepVolumeForPip(volume, near)) continue;
    const emphasis = muscleEmphasisFor(volume.kind, opts.exerciseId);
    painted.push({
      volume,
      emphasis,
      scale: pipPaintScale(volume.kind, emphasis),
    });
  }
  painted.sort((a, b) => {
    const ea = a.emphasis === "active" ? 1 : 0;
    const eb = b.emphasis === "active" ? 1 : 0;
    return ea - eb;
  });
  return painted;
}

/** @deprecated 用 pipVolumesToPaint；保留给旧单测。 */
export function sortVolumesForPaint(
  volumes: readonly Rig3dVolume[],
  exerciseId: string,
): Rig3dVolume[] {
  return [...volumes].sort((a, b) => {
    const ea = muscleEmphasisFor(a.kind, exerciseId) === "active" ? 1 : 0;
    const eb = muscleEmphasisFor(b.kind, exerciseId) === "active" ? 1 : 0;
    return ea - eb;
  });
}
