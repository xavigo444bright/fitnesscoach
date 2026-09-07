/**
 * 训练示范窗样片（FR-086）：播放参考库原片（轨迹 source.label），
 * 随站位 side/front 换片。不是详情页 P2 解剖片，也不是轨迹骨骼动画。
 * Metro 要求 require 路径静态存在。
 */
import {
  hasDemoTrajectory,
  getDemoTrajectory,
  type TrajectoryCameraHint,
  type TrajectoryExerciseId,
} from '@fitness-coach/core';

/** 与入库轨迹 source.label 一一对应的原片。臀桥/弓步只打进侧面这一条（NFR-010 不打整库）。 */
const BY_FILE: Record<string, number> = {
  'squat-side-01.mp4': require('../assets/samples/squat-side-01.mp4'),
  'squat-front-01.mp4': require('../assets/samples/squat-front-01.mp4'),
  'pushup-side-01.mp4': require('../assets/samples/pushup-side-01.mp4'),
  'pushup-front-01.mp4': require('../assets/samples/pushup-front-01.mp4'),
  'glute-bridge-side-01.mp4': require('../assets/samples/glute-bridge-side-01.mp4'),
  'lunge-side-02.mp4': require('../assets/samples/lunge-side-02.mp4'),
  'plank-side-01.mp4': require('../assets/samples/plank-side-01.mp4'),
  'db-row-side-01.mp4': require('../assets/samples/db-row-side-01.mp4'),
  'ohp-side-01.mp4': require('../assets/samples/ohp-side-01.mp4'),
  'bench-press-side-01.mp4': require('../assets/samples/bench-press-side-01.mp4'),
  'rdl-side-01.mp4': require('../assets/samples/rdl-side-01.mp4'),
  'pullup-side-01.mp4': require('../assets/samples/pullup-side-01.mp4'),
  'db-fly-side-01.mp4': require('../assets/samples/db-fly-side-01.mp4'),
  'dip-side-01.mp4': require('../assets/samples/dip-side-01.mp4'),
  'incline-pushup-side-01.mp4': require('../assets/samples/incline-pushup-side-01.mp4'),
  'cable-crossover-front-01.mp4': require('../assets/samples/cable-crossover-front-01.mp4'),
  'chest-press-machine-side-01.mp4': require('../assets/samples/chest-press-machine-side-01.mp4'),
  'lateral-raise-front-01.mp4': require('../assets/samples/lateral-raise-front-01.mp4'),
  'front-raise-side-01.mp4': require('../assets/samples/front-raise-side-01.mp4'),
  'rear-delt-fly-side-01.mp4': require('../assets/samples/rear-delt-fly-side-01.mp4'),
  'face-pull-side-01.mp4': require('../assets/samples/face-pull-side-01.mp4'),
  'pike-pushup-side-01.mp4': require('../assets/samples/pike-pushup-side-01.mp4'),
};

/** 无打包轨迹时仍可播的原片（臀桥/弓步 JSON 未进 JS 包）。 */
const CLIP_WITHOUT_TRAJECTORY: Partial<
  Record<TrajectoryExerciseId, Partial<Record<TrajectoryCameraHint, string>>>
> = {
  'glute-bridge': { side: 'glute-bridge-side-01.mp4' },
  lunge: { side: 'lunge-side-02.mp4' },
  plank: { side: 'plank-side-01.mp4' },
  'db-row': { side: 'db-row-side-01.mp4' },
  ohp: { side: 'ohp-side-01.mp4' },
  'bench-press': { side: 'bench-press-side-01.mp4' },
  rdl: { side: 'rdl-side-01.mp4' },
  pullup: { side: 'pullup-side-01.mp4' },
  'db-fly': { side: 'db-fly-side-01.mp4' },
  dip: { side: 'dip-side-01.mp4' },
  'incline-pushup': { side: 'incline-pushup-side-01.mp4' },
  'cable-crossover': {
    front: 'cable-crossover-front-01.mp4',
    side: 'cable-crossover-front-01.mp4',
  },
  'chest-press-machine': { side: 'chest-press-machine-side-01.mp4' },
  'lateral-raise': {
    front: 'lateral-raise-front-01.mp4',
    side: 'lateral-raise-front-01.mp4',
  },
  'front-raise': { side: 'front-raise-side-01.mp4' },
  'rear-delt-fly': { side: 'rear-delt-fly-side-01.mp4' },
  'face-pull': { side: 'face-pull-side-01.mp4' },
  'pike-pushup': { side: 'pike-pushup-side-01.mp4' },
};

export type SampleClipRef = {
  source: number;
  fileName: string;
};

export function sampleClipFileName(
  exerciseId: TrajectoryExerciseId,
  cameraHint: TrajectoryCameraHint = 'side',
): string | null {
  const direct = CLIP_WITHOUT_TRAJECTORY[exerciseId]?.[cameraHint];
  if (direct && BY_FILE[direct] != null) return direct;
  if (!hasDemoTrajectory(exerciseId, cameraHint)) return null;
  const label = getDemoTrajectory(exerciseId, cameraHint).source.label;
  return label && BY_FILE[label] != null ? label : null;
}

export function resolveSampleClip(
  exerciseId: TrajectoryExerciseId,
  cameraHint: TrajectoryCameraHint = 'side',
): SampleClipRef | null {
  const fileName = sampleClipFileName(exerciseId, cameraHint);
  if (!fileName) return null;
  const source = BY_FILE[fileName];
  if (source == null) return null;
  return { source, fileName };
}
