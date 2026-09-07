/**
 * 臀桥几何夹具：侧面仰卧屈膝；肩-髋-膝夹角精确构造。
 */

import { LandmarkIndex, type Landmark, type Pose } from "../types.js";

interface Vec2 {
  x: number;
  y: number;
}

const lm = (v: Vec2): Landmark => ({ x: v.x, y: v.y, visibility: 1 });

function rotate(v: Vec2, deg: number): Vec2 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/**
 * 侧面臀桥。hipDeg：肩-髋-膝（贴地较小，顶髋锁髋接近 180°）。
 */
export function buildGluteBridgePose(opts: { hipDeg: number }): Pose {
  const { hipDeg } = opts;
  const hip: Vec2 = { x: 0.48, y: 0.62 };
  const thigh = 0.18;
  const shin = 0.16;
  const torso = 0.22;
  const knee: Vec2 = { x: hip.x + thigh, y: hip.y };
  const ankle: Vec2 = { x: knee.x + shin * 0.35, y: knee.y + shin };

  const hipToKnee: Vec2 = { x: knee.x - hip.x, y: knee.y - hip.y };
  const c1 = rotate(hipToKnee, hipDeg);
  const c2 = rotate(hipToKnee, -hipDeg);
  const pick = c1.y <= c2.y ? c1 : c2;
  const n = Math.hypot(pick.x, pick.y) || 1;
  const shoulder: Vec2 = {
    x: hip.x + (torso * pick.x) / n,
    y: hip.y + (torso * pick.y) / n,
  };

  const pose: Pose = [];
  pose[LandmarkIndex.LeftShoulder] = lm(shoulder);
  pose[LandmarkIndex.RightShoulder] = lm(shoulder);
  pose[LandmarkIndex.LeftHip] = lm(hip);
  pose[LandmarkIndex.RightHip] = lm(hip);
  pose[LandmarkIndex.LeftKnee] = lm(knee);
  pose[LandmarkIndex.RightKnee] = lm(knee);
  pose[LandmarkIndex.LeftAnkle] = lm(ankle);
  pose[LandmarkIndex.RightAnkle] = lm(ankle);
  pose[LandmarkIndex.LeftWrist] = lm({
    x: shoulder.x + 0.04,
    y: shoulder.y + 0.08,
  });
  pose[LandmarkIndex.RightWrist] = lm({
    x: shoulder.x + 0.04,
    y: shoulder.y + 0.08,
  });
  return pose;
}
