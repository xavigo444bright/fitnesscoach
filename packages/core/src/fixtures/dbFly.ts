/**
 * 哑铃飞鸟夹具：头侧/偏正几何（仰卧，左右开合）。
 * wristIncludedDeg = 双腕相对肩中点夹角（合拢小、打开大）。
 */

import { LandmarkIndex, type Landmark, type Pose } from "../types.js";

interface Vec2 {
  x: number;
  y: number;
}

const lm = (v: Vec2): Landmark => ({ x: v.x, y: v.y, visibility: 1 });

/**
 * 构造飞鸟姿态。开合角越大，腕越向两侧打开。
 */
export function buildDbFlyPose(opts: { wristIncludedDeg: number }): Pose {
  const included = Math.min(170, Math.max(4, opts.wristIncludedDeg));
  const ls: Vec2 = { x: 0.42, y: 0.4 };
  const rs: Vec2 = { x: 0.58, y: 0.4 };
  const mid: Vec2 = { x: 0.5, y: 0.4 };
  const reach = 0.22;
  const halfRad = ((included / 2) * Math.PI) / 180;
  const lw: Vec2 = {
    x: mid.x - reach * Math.sin(halfRad),
    y: mid.y + reach * Math.cos(halfRad),
  };
  const rw: Vec2 = {
    x: mid.x + reach * Math.sin(halfRad),
    y: mid.y + reach * Math.cos(halfRad),
  };
  const le: Vec2 = {
    x: ls.x + (lw.x - ls.x) * 0.55,
    y: ls.y + (lw.y - ls.y) * 0.55,
  };
  const re: Vec2 = {
    x: rs.x + (rw.x - rs.x) * 0.55,
    y: rs.y + (rw.y - rs.y) * 0.55,
  };
  const lh: Vec2 = { x: 0.46, y: 0.62 };
  const rh: Vec2 = { x: 0.54, y: 0.62 };
  const pose: Pose = [];
  pose[LandmarkIndex.LeftShoulder] = lm(ls);
  pose[LandmarkIndex.RightShoulder] = lm(rs);
  pose[LandmarkIndex.LeftElbow] = lm(le);
  pose[LandmarkIndex.RightElbow] = lm(re);
  pose[LandmarkIndex.LeftWrist] = lm(lw);
  pose[LandmarkIndex.RightWrist] = lm(rw);
  pose[LandmarkIndex.LeftHip] = lm(lh);
  pose[LandmarkIndex.RightHip] = lm(rh);
  pose[LandmarkIndex.LeftKnee] = lm({ x: 0.46, y: 0.78 });
  pose[LandmarkIndex.RightKnee] = lm({ x: 0.54, y: 0.78 });
  pose[LandmarkIndex.LeftAnkle] = lm({ x: 0.46, y: 0.9 });
  pose[LandmarkIndex.RightAnkle] = lm({ x: 0.54, y: 0.9 });
  return pose;
}
