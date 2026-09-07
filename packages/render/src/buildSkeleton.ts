/**
 * Pose → SkeletonScene（平台无关；颜色默认 correct，T2 再按规则上色）
 */

import {
  LandmarkIndex,
  type Pose,
  type ValidationStatus,
} from "@fitness-coach/core";
import {
  FACE_CONTOUR_BONES,
  keepFaceJointForContour,
  keepJointForOverlay,
  POSE_BONES,
  type OverlayLimbPolicy,
} from "./bones.js";
import type { NearLimbSide } from "./muscleTint.js";
import type { RenderBone, RenderJoint, SkeletonScene } from "./types.js";

export interface BuildSkeletonOptions {
  /** 若提供，输出 pixel 坐标。 */
  width?: number;
  height?: number;
  /** 缺省关节状态。 */
  defaultStatus?: ValidationStatus;
  /** 侧面只画近镜头一侧；默认 both。 */
  nearSide?: NearLimbSide;
  /** 默认 near-all；卧推侧视为 near-legs。 */
  limbPolicy?: OverlayLimbPolicy;
  /** 关节 visibility 低于此不进场景。0 表示不额外过滤。 */
  minVisibility?: number;
}

/**
 * 从 Pose 构建可绘制场景。缺失关键点不进 joints，对应 bone 跳过。
 */
export function buildSkeletonScene(
  pose: Pose,
  options: BuildSkeletonOptions = {},
): SkeletonScene {
  const defaultStatus = options.defaultStatus ?? "correct";
  const nearSide = options.nearSide ?? "both";
  const limbPolicy = options.limbPolicy ?? "near-all";
  const minVisibility = options.minVisibility ?? 0;
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
    if (!keepFaceJointForContour(i)) continue;
    if (!keepJointForOverlay(i, nearSide, limbPolicy)) continue;
    if (minVisibility > 0 && (lm.visibility ?? 1) < minVisibility) continue;
    const x = toPixel ? lm.x * width : lm.x;
    const y = toPixel ? lm.y * height : lm.y;
    joints.push({ index: i, x, y, status: defaultStatus });
    present.add(i);
  }

  const bones: RenderBone[] = [];
  for (const [from, to] of [...POSE_BONES, ...FACE_CONTOUR_BONES]) {
    if (!present.has(from) || !present.has(to)) continue;
    bones.push({ from, to, status: defaultStatus });
  }
  const armFallback: ReadonlyArray<readonly [number, number, number]> = [
    [LandmarkIndex.LeftShoulder, LandmarkIndex.LeftElbow, LandmarkIndex.LeftWrist],
    [
      LandmarkIndex.RightShoulder,
      LandmarkIndex.RightElbow,
      LandmarkIndex.RightWrist,
    ],
  ];
  for (const [from, mid, to] of armFallback) {
    if (present.has(from) && present.has(to) && !present.has(mid)) {
      bones.push({ from, to, status: defaultStatus });
    }
  }

  return {
    joints,
    bones,
    space: toPixel ? "pixel" : "normalized",
    ...(toPixel ? { width, height } : {}),
  };
}
