/**
 * @fitness-coach/pose-native — 弱光检测（M4-T6 / FR-023 / VT-P4-001）
 *
 * 用关键关键点平均 visibility 近似光照质量；过低时提示改善光线。
 */

import { LandmarkIndex, type Pose } from "@fitness-coach/core";

/** 深蹲侧摄关心的关键点。 */
export const LOW_LIGHT_KEYPOINTS: number[] = [
  LandmarkIndex.LeftShoulder,
  LandmarkIndex.RightShoulder,
  LandmarkIndex.LeftHip,
  LandmarkIndex.RightHip,
  LandmarkIndex.LeftKnee,
  LandmarkIndex.RightKnee,
  LandmarkIndex.LeftAnkle,
  LandmarkIndex.RightAnkle,
];

/** 平均 visibility 低于此视为弱光。 */
export const DEFAULT_LOW_LIGHT_MEAN_VISIBILITY = 0.4;

export const LOW_LIGHT_HINT = "请改善光线";

export interface LowLightResult {
  lowLight: boolean;
  /** 参与平均的关键点均值；无可用点则为 null。 */
  meanVisibility: number | null;
  hint: string | null;
}

/**
 * 计算指定关键点的平均 visibility（缺 visibility 视为 1；缺关键点跳过）。
 */
export function meanKeypointVisibility(
  pose: Pose,
  indices: number[] = LOW_LIGHT_KEYPOINTS,
): number | null {
  let sum = 0;
  let n = 0;
  for (const i of indices) {
    const lm = pose[i];
    if (!lm) continue;
    sum += lm.visibility ?? 1;
    n += 1;
  }
  if (n === 0) return null;
  return sum / n;
}

export function evaluateLowLight(
  pose: Pose | null | undefined,
  minMean: number = DEFAULT_LOW_LIGHT_MEAN_VISIBILITY,
): LowLightResult {
  if (!pose) {
    return { lowLight: false, meanVisibility: null, hint: null };
  }
  const mean = meanKeypointVisibility(pose);
  if (mean == null) {
    return { lowLight: false, meanVisibility: null, hint: null };
  }
  const lowLight = mean < minMean;
  return {
    lowLight,
    meanVisibility: mean,
    hint: lowLight ? LOW_LIGHT_HINT : null,
  };
}
