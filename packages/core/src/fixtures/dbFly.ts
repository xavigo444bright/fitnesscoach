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

/**
 * 手臂相对竖直。tiltDeg 0 = 下垂，90 = 水平。
 * inDepth：水平分量在 z，画面里双肩双腕叠在一起（正侧面朝镜头打开）。
 */
export function buildArmTiltPose(opts: {
  tiltDeg?: number;
  inDepth?: boolean;
  onlySide?: "left" | "right";
  collapsed?: boolean;
}): Pose {
  const tilt = Math.min(90, Math.max(0, opts.tiltDeg ?? 0));
  const rad = (tilt * Math.PI) / 180;
  const arm = 0.22;
  const down = arm * Math.cos(rad);
  const horiz = arm * Math.sin(rad);
  const y0 = 0.4;
  const ls: Landmark = opts.inDepth
    ? { x: 0.5, y: y0, z: 0, visibility: 1 }
    : { x: 0.42, y: y0, z: 0, visibility: 1 };
  const rs: Landmark = opts.inDepth
    ? { x: 0.5, y: y0, z: 0, visibility: 1 }
    : { x: 0.58, y: y0, z: 0, visibility: 1 };
  const along = (shoulder: Landmark, sign: number, scale: number): Landmark => {
    if (opts.collapsed) {
      return { x: shoulder.x, y: shoulder.y, z: shoulder.z, visibility: 1 };
    }
    if (opts.inDepth) {
      return {
        x: shoulder.x,
        y: shoulder.y + down * scale,
        z: (shoulder.z ?? 0) + sign * horiz * scale,
        visibility: 1,
      };
    }
    return {
      x: shoulder.x + sign * horiz * scale,
      y: shoulder.y + down * scale,
      z: 0,
      visibility: 1,
    };
  };
  const pose: Pose = [];
  pose[LandmarkIndex.LeftShoulder] = ls;
  pose[LandmarkIndex.RightShoulder] = rs;
  if (opts.onlySide !== "right") {
    pose[LandmarkIndex.LeftElbow] = along(ls, -1, 0.55);
    pose[LandmarkIndex.LeftWrist] = along(ls, -1, 1);
  }
  if (opts.onlySide !== "left") {
    pose[LandmarkIndex.RightElbow] = along(rs, 1, 0.55);
    pose[LandmarkIndex.RightWrist] = along(rs, 1, 1);
  }
  pose[LandmarkIndex.LeftHip] = { x: 0.48, y: 0.62, visibility: 1 };
  pose[LandmarkIndex.RightHip] = { x: 0.52, y: 0.62, visibility: 1 };
  return pose;
}
