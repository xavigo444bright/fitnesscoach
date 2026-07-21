/**
 * Pose → SkeletonScene（平台无关；颜色默认 correct，T2 再按规则上色）
 */

import type { Pose, ValidationStatus } from "@fitness-coach/core";
import { POSE_BONES } from "./bones.js";
import type { RenderBone, RenderJoint, SkeletonScene } from "./types.js";

export interface BuildSkeletonOptions {
  /** 若提供，输出 pixel 坐标。 */
  width?: number;
  height?: number;
  /** 缺省关节状态。 */
  defaultStatus?: ValidationStatus;
}

/**
 * 从 Pose 构建可绘制场景。缺失关键点不进 joints，对应 bone 跳过。
 */
export function buildSkeletonScene(
  pose: Pose,
  options: BuildSkeletonOptions = {},
): SkeletonScene {
  const defaultStatus = options.defaultStatus ?? "correct";
  const toPixel =
    options.width != null &&
    options.height != null &&
    options.width > 0 &&
    options.height > 0;
  const width = options.width ?? 0;
  const height = options.height ?? 0;

  const joints: RenderJoint[] = [];
  const present = new Set<number>();

  for (let i = 0; i < pose.length; i += 1) {
    const lm = pose[i];
    if (!lm) continue;
    const x = toPixel ? lm.x * width : lm.x;
    const y = toPixel ? lm.y * height : lm.y;
    joints.push({ index: i, x, y, status: defaultStatus });
    present.add(i);
  }

  const bones: RenderBone[] = [];
  for (const [from, to] of POSE_BONES) {
    if (!present.has(from) || !present.has(to)) continue;
    bones.push({ from, to, status: defaultStatus });
  }

  return {
    joints,
    bones,
    space: toPixel ? "pixel" : "normalized",
    ...(toPixel ? { width, height } : {}),
  };
}
