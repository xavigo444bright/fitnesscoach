/**
 * 俯卧撑几何夹具：侧面 plank；肘角用绕肘旋转精确构造。
 */

import { LandmarkIndex, type Landmark, type Pose } from "../types.js";

interface Vec2 {
  x: number;
  y: number;
}

const lm = (v: Vec2): Landmark => ({ x: v.x, y: v.y, visibility: 1 });

function rot(v: Vec2, deg: number): Vec2 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function norm(v: Vec2): Vec2 {
  const L = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / L, y: v.y / L };
}

/**
 * 侧面俯卧撑。
 * elbowDeg：肩-肘-腕夹角（精确构造）。
 * hipDrop：髋下沉量，增大则肩-髋-踝角变小。
 */
export function buildPushupPose(opts: {
  elbowDeg: number;
  hipDrop?: number;
}): Pose {
  const { elbowDeg, hipDrop = 0 } = opts;
  const ankle: Vec2 = { x: 0.78, y: 0.7 };
  const shoulder: Vec2 = { x: 0.3, y: 0.4 };
  const hip: Vec2 = {
    x: shoulder.x + (ankle.x - shoulder.x) * 0.48,
    y: shoulder.y + (ankle.y - shoulder.y) * 0.48 + hipDrop,
  };

  const elbow: Vec2 = { x: shoulder.x + 0.08, y: shoulder.y + 0.11 };
  const fromElbowToShoulder = {
    x: shoulder.x - elbow.x,
    y: shoulder.y - elbow.y,
  };
  // 夹角 elbowDeg：将 (E→S) 旋转 ±elbowDeg 得到 (E→W)
  const dirA = norm(rot(fromElbowToShoulder, elbowDeg));
  const dirB = norm(rot(fromElbowToShoulder, -elbowDeg));
  // 腕放在更靠「地面/前方」的一侧（y 更大）
  const dir = dirA.y >= dirB.y ? dirA : dirB;
  const fore = 0.13;
  const wrist: Vec2 = {
    x: elbow.x + fore * dir.x,
    y: elbow.y + fore * dir.y,
  };

  const pose: Pose = [];
  pose[LandmarkIndex.LeftShoulder] = lm(shoulder);
  pose[LandmarkIndex.RightShoulder] = lm(shoulder);
  pose[LandmarkIndex.LeftElbow] = lm(elbow);
  pose[LandmarkIndex.RightElbow] = lm(elbow);
  pose[LandmarkIndex.LeftWrist] = lm(wrist);
  pose[LandmarkIndex.RightWrist] = lm(wrist);
  pose[LandmarkIndex.LeftHip] = lm(hip);
  pose[LandmarkIndex.RightHip] = lm(hip);
  pose[LandmarkIndex.LeftAnkle] = lm(ankle);
  pose[LandmarkIndex.RightAnkle] = lm(ankle);
  return pose;
}
