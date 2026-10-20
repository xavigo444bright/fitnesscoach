/**
 * 引体悬垂几何：身体竖直，手臂在头顶。
 * side = 肩叠在一起；front = 肩拉开，正前和正后在画面里是同一种形状。
 * 肘角按绕肘旋转精确构造，供认人模板，不拿来抄阈值。
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
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function wristFor(shoulder: Vec2, elbow: Vec2, elbowDeg: number): Vec2 {
  const fromElbowToShoulder = {
    x: shoulder.x - elbow.x,
    y: shoulder.y - elbow.y,
  };
  const base = norm(fromElbowToShoulder);
  const fore = 0.14;
  const candidates = [rot(base, elbowDeg), rot(base, -elbowDeg)].map((dir) => ({
    x: elbow.x + fore * dir.x,
    y: elbow.y + fore * dir.y,
  }));
  // 手留在杠上：更靠上，并且更靠近这侧肩的垂线。
  return candidates.reduce((best, w) => {
    const score = (p: Vec2) => p.y * 2 + Math.abs(p.x - shoulder.x);
    return score(w) < score(best) ? w : best;
  });
}

function elbowFor(shoulder: Vec2, elbowDeg: number, outward: number): Vec2 {
  const bend = Math.min(1, Math.max(0, (180 - elbowDeg) / 180));
  const flare = 0.01 + bend * 0.14;
  return {
    x: shoulder.x + outward * flare,
    y: shoulder.y - 0.16 + bend * 0.12,
  };
}

/**
 * 悬垂或拉起。elbowDeg 是肩-肘-腕夹角。
 * view=front 同时覆盖正背后：两肩拉开，肘向两侧。
 */
export function buildPullupHangPose(opts: {
  elbowDeg: number;
  view: "side" | "front";
}): Pose {
  const { elbowDeg, view } = opts;
  const shoulders: Array<{ at: Vec2; outward: number }> =
    view === "side"
      ? [
          { at: { x: 0.5, y: 0.46 }, outward: -1 },
          { at: { x: 0.5, y: 0.46 }, outward: -1 },
        ]
      : [
          { at: { x: 0.4, y: 0.46 }, outward: -1 },
          { at: { x: 0.6, y: 0.46 }, outward: 1 },
        ];
  const pose: Pose = [];
  const indexes = [
    {
      shoulder: LandmarkIndex.LeftShoulder,
      elbow: LandmarkIndex.LeftElbow,
      wrist: LandmarkIndex.LeftWrist,
      hip: LandmarkIndex.LeftHip,
      knee: LandmarkIndex.LeftKnee,
      ankle: LandmarkIndex.LeftAnkle,
    },
    {
      shoulder: LandmarkIndex.RightShoulder,
      elbow: LandmarkIndex.RightElbow,
      wrist: LandmarkIndex.RightWrist,
      hip: LandmarkIndex.RightHip,
      knee: LandmarkIndex.RightKnee,
      ankle: LandmarkIndex.RightAnkle,
    },
  ] as const;
  indexes.forEach((idx, i) => {
    const shoulder = shoulders[i]!.at;
    const elbow = elbowFor(shoulder, elbowDeg, shoulders[i]!.outward);
    const wrist = wristFor(shoulder, elbow, elbowDeg);
    const hip = { x: shoulder.x, y: shoulder.y + 0.2 };
    const knee = { x: shoulder.x, y: hip.y + 0.14 };
    const ankle = { x: shoulder.x, y: knee.y + 0.12 };
    pose[idx.shoulder] = lm(shoulder);
    pose[idx.elbow] = lm(elbow);
    pose[idx.wrist] = lm(wrist);
    pose[idx.hip] = lm(hip);
    pose[idx.knee] = lm(knee);
    pose[idx.ankle] = lm(ankle);
  });
  return pose;
}
