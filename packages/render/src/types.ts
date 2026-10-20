/**
 * @fitness-coach/render — 骨骼场景数据结构（M3-T1 / VT-P3A-001 / FR-060）
 */

import type { ValidationStatus } from "@fitness-coach/core";

/** 校验色，加上读不到的点。叠点只涂这些点，不整副涂灰。 */
export type SkeletonPaint = ValidationStatus | "muted";

/** 归一化或像素坐标的关节点。 */
export interface RenderJoint {
  /** MediaPipe 索引。 */
  index: number;
  x: number;
  y: number;
  status: SkeletonPaint;
}

/** 骨骼连线（两端均为关节索引）。 */
export interface RenderBone {
  from: number;
  to: number;
  status: SkeletonPaint;
}

/** 一帧可绘制骨架（用户骨或临时 2D 参考骨占位）。 */
export interface SkeletonScene {
  joints: RenderJoint[];
  bones: RenderBone[];
  /** 坐标空间：normalized=0–1；pixel=相对 width/height。 */
  space: "normalized" | "pixel";
  width?: number;
  height?: number;
}
