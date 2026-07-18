/**
 * @fitness-coach/pose-native — visibility 过滤（M2A-T3，VT-P2-004 / FR-032）
 *
 * 低置信度关节置为 undefined，使 core validate/angles 不参与计算。
 */

import type { Landmark, Pose } from "@fitness-coach/core";

/** FR-032：visibility < 0.5 视为不可见。 */
export const DEFAULT_VISIBILITY_THRESHOLD = 0.5;

/**
 * 关键点是否达到可见阈值。
 * visibility 缺失时视为可见（不做猜测剔除）。
 */
export function isVisible(
  lm: Landmark | undefined,
  threshold: number = DEFAULT_VISIBILITY_THRESHOLD,
): boolean {
  if (!lm) return false;
  if (lm.visibility == null) return true;
  return lm.visibility >= threshold;
}

/**
 * 过滤低置信度关键点：不达标 → undefined，其余原样保留。
 * 不修改入参。
 */
export function filterByVisibility(
  pose: Pose,
  threshold: number = DEFAULT_VISIBILITY_THRESHOLD,
): Pose {
  const out: Pose = [];
  for (let i = 0; i < pose.length; i += 1) {
    const lm = pose[i];
    out[i] = isVisible(lm, threshold) ? lm : undefined;
  }
  return out;
}
