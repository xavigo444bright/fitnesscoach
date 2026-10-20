/**
 * @fitness-coach/core — 角度计算（M1-T2，VT-P1-002）
 *
 * 平台无关：只吃 Landmark / Pose，不碰摄像头或 UI。
 */

import type { JointTriplet, Landmark, Pose } from "./types.js";

/**
 * 肩与腕（或肘）近到这个归一化距离，视为叠在同一个点，这帧不拿它当手臂。
 * 三维长度：侧机位手臂朝镜头时画面距离可以很短，深度仍算手臂。
 */
export const ARM_POINT_STUB = 0.03;

function depthDelta(from: Landmark, to: Landmark): number {
  if (from.z == null || to.z == null) return 0;
  return to.z - from.z;
}

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

export function hasWorldPoint(
  lm: Landmark | undefined,
): lm is Landmark & { wx: number; wy: number; wz: number } {
  return (
    lm != null &&
    lm.wx != null &&
    lm.wy != null &&
    lm.wz != null &&
    Number.isFinite(lm.wx) &&
    Number.isFinite(lm.wy) &&
    Number.isFinite(lm.wz)
  );
}

/** 世界坐标夹角。三点缺一则 null。画面里的 z 不算世界坐标。 */
export function worldJointAngle(pose: Pose, joints: JointTriplet): number | null {
  const a = pose[joints.a];
  const b = pose[joints.b];
  const c = pose[joints.c];
  if (!hasWorldPoint(a) || !hasWorldPoint(b) || !hasWorldPoint(c)) return null;
  return angleBetween3d(
    { x: a.wx, y: a.wy, z: a.wz },
    { x: b.wx, y: b.wy, z: b.wz },
    { x: c.wx, y: c.wy, z: c.wz },
  );
}

/** 只看画面 x/y，给调试页对照三维角。 */
export function jointAngleImage(pose: Pose, joints: JointTriplet): number | null {
  const a = pose[joints.a];
  const b = pose[joints.b];
  const c = pose[joints.c];
  if (!a || !b || !c) return null;
  return angleBetween(a, b, c);
}

/**
 * 从姿态里按三点索引取角。任一点缺失返回 null。
 * 三点都有世界坐标时用米制夹角，正面和侧面是同一个数。
 * 日志 C06-01，见 docs/count-change-log.md。
 */
export function jointAngle(pose: Pose, joints: JointTriplet): number | null {
  return worldJointAngle(pose, joints) ?? jointAngleImage(pose, joints);
}

/** 至少三个点带世界坐标，这一帧的关节角可以按三维算。 */
export function poseHasWorld(pose: Pose): boolean {
  let n = 0;
  for (const lm of pose) {
    if (hasWorldPoint(lm)) n += 1;
    if (n >= 3) return true;
  }
  return false;
}

/** 去掉世界坐标，让驱动角退回画面二维。 */
export function poseImageOnly(pose: Pose): Pose {
  const out: Pose = [];
  for (let i = 0; i < pose.length; i += 1) {
    const lm = pose[i];
    if (!lm) continue;
    const next: Landmark = { x: lm.x, y: lm.y };
    if (lm.z != null) next.z = lm.z;
    if (lm.visibility != null) next.visibility = lm.visibility;
    out[i] = next;
  }
  return out;
}

/**
 * 与竖直轴的夹角：0° 顺着重力（朝上或朝下），90° 水平。
 * 有深度时水平分量含 z（MediaPipe 的 z 与 x 同量级）。两点几乎重合则 null。
 */
export function tiltFromVerticalDeg(
  origin: Landmark,
  tip: Landmark,
): number | null {
  const dx = tip.x - origin.x;
  const dy = tip.y - origin.y;
  const dz = depthDelta(origin, tip);
  if (Math.hypot(dx, dy, dz) < ARM_POINT_STUB) return null;
  return (Math.atan2(Math.hypot(dx, dz), Math.abs(dy)) * 180) / Math.PI;
}

/**
 * 三点夹角，深度齐全时算进向量。任一段短于叠点则 null。
 * 缺深度时退回画面夹角。
 */
export function angleBetween3d(
  a: Landmark,
  b: Landmark,
  c: Landmark,
): number | null {
  const useZ = a.z != null && b.z != null && c.z != null;
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v1z = useZ ? (a.z ?? 0) - (b.z ?? 0) : 0;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const v2z = useZ ? (c.z ?? 0) - (b.z ?? 0) : 0;
  const n1 = Math.hypot(v1x, v1y, v1z);
  const n2 = Math.hypot(v2x, v2y, v2z);
  if (n1 < ARM_POINT_STUB || n2 < ARM_POINT_STUB) return null;
  const cos = Math.min(
    1,
    Math.max(-1, (v1x * v2x + v1y * v2y + v1z * v2z) / (n1 * n2)),
  );
  return (Math.acos(cos) * 180) / Math.PI;
}
