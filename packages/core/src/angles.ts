/**
 * @fitness-coach/core — 角度计算（M1-T2，VT-P1-002）
 *
 * 平台无关：只吃 Landmark / Pose，不碰摄像头或 UI。
 */

import type { JointTriplet, Landmark, Pose } from "./types.js";

/**
 * 三点 a-b-c 的夹角（顶点 b），返回 [0,180] 度。
 * 用 atan2 差值，避免向量归一化时的除零与浮点误差。
 */
export function angleBetween(a: Landmark, b: Landmark, c: Landmark): number {
  const rad =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs((rad * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
}

/**
 * 从姿态里按三点索引取角。任一点缺失返回 null（交由上层按 visibility 决策）。
 */
export function jointAngle(pose: Pose, joints: JointTriplet): number | null {
  const a = pose[joints.a];
  const b = pose[joints.b];
  const c = pose[joints.c];
  if (!a || !b || !c) return null;
  return angleBetween(a, b, c);
}
