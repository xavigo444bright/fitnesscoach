/**
 * 侧平举 / 前平举夹具：站姿。
 * 侧平举外展 = 肩到肘或腕相对竖直向下；前平举每侧取髋-肩-肘与竖直外展的较大值。
 * abductionDeg 0 = 臂下垂，90 ≈ 抬至肩高（默认肘腕共线）。
 */

import { LandmarkIndex, type Landmark, type Pose } from "../types.js";

interface Vec2 {
  x: number;
  y: number;
}

const lm = (v: Vec2): Landmark => ({ x: v.x, y: v.y, visibility: 1 });

export function buildRaisePose(opts: {
  abductionDeg: number;
  /** 缺省与腕同角；健身房侧平举肘常低于哑铃，可单独压低肘外展。 */
  elbowAbductionDeg?: number;
  /** 真侧摄时左右肩几乎重叠，肩宽 <0.12，关掉侧平举 raise-height。 */
  sideView?: boolean;
}): Pose {
  const abd = Math.min(170, Math.max(2, opts.abductionDeg));
  const elbowAbd = Math.min(
    170,
    Math.max(2, opts.elbowAbductionDeg ?? abd),
  );
  const rad = (abd * Math.PI) / 180;
  const elbowRad = (elbowAbd * Math.PI) / 180;
  const spread = opts.sideView ? 0.03 : 0.08;
  const ls: Vec2 = { x: 0.5 - spread, y: 0.36 };
  const rs: Vec2 = { x: 0.5 + spread, y: 0.36 };
  const lh: Vec2 = { x: 0.5 - spread * 0.5, y: 0.62 };
  const rh: Vec2 = { x: 0.5 + spread * 0.5, y: 0.62 };
  const arm = 0.16;
  const le: Vec2 = {
    x: ls.x - arm * Math.sin(elbowRad),
    y: ls.y + arm * Math.cos(elbowRad),
  };
  const re: Vec2 = {
    x: rs.x + arm * Math.sin(elbowRad),
    y: rs.y + arm * Math.cos(elbowRad),
  };
  const lw: Vec2 = {
    x: ls.x - arm * 1.85 * Math.sin(rad),
    y: ls.y + arm * 1.85 * Math.cos(rad),
  };
  const rw: Vec2 = {
    x: rs.x + arm * 1.85 * Math.sin(rad),
    y: rs.y + arm * 1.85 * Math.cos(rad),
  };
  const pose: Pose = [];
  pose[LandmarkIndex.LeftShoulder] = lm(ls);
  pose[LandmarkIndex.RightShoulder] = lm(rs);
  pose[LandmarkIndex.LeftElbow] = lm(le);
  pose[LandmarkIndex.RightElbow] = lm(re);
  pose[LandmarkIndex.LeftWrist] = lm(lw);
  pose[LandmarkIndex.RightWrist] = lm(rw);
  pose[LandmarkIndex.LeftHip] = lm(lh);
  pose[LandmarkIndex.RightHip] = lm(rh);
  pose[LandmarkIndex.LeftKnee] = lm({ x: lh.x, y: 0.78 });
  pose[LandmarkIndex.RightKnee] = lm({ x: rh.x, y: 0.78 });
  pose[LandmarkIndex.LeftAnkle] = lm({ x: lh.x, y: 0.92 });
  pose[LandmarkIndex.RightAnkle] = lm({ x: rh.x, y: 0.92 });
  return pose;
}
