/**
 * @fitness-coach/render — 骨骼场景数据结构（M3-T1 / VT-P3A-001 / FR-060）
 */

import type { ValidationStatus } from "@fitness-coach/core";

/** 归一化或像素坐标的关节点。 */
export interface RenderJoint {
  /** MediaPipe 索引。 */
  index: number;
  x: number;
  y: number;
  status: ValidationStatus;
}

/** 骨骼连线（两端均为关节索引）。 */
export interface RenderBone {
  from: number;
  to: number;
  status: ValidationStatus;
}

/** 丰满 2D 解剖引导折线（FR-068 A 方案；非 3D）。 */
export type GuideKind = "spine" | "limb" | "head" | "hip";

export interface GuidePoint {
  x: number;
  y: number;
}

export interface GuidePath {
  id: string;
  kind: GuideKind;
  points: GuidePoint[];
  /** 归一化建议线宽（相对短边比例，App 再乘像素） */
  strokeWidth: number;
}

/** 一帧可绘制骨架。 */
export interface SkeletonScene {
  joints: RenderJoint[];
  bones: RenderBone[];
  /** 参考骨 anatomy guides；用户骨可省略 */
  guides?: GuidePath[];
  /** 坐标空间：normalized=0–1；pixel=相对 width/height。 */
  space: "normalized" | "pixel";
  width?: number;
  height?: number;
}
