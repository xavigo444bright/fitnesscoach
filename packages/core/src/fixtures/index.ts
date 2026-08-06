/**
 * @fitness-coach/core — 测试夹具（M1-T3，VT-P1-010）
 *
 * 侧面视角、归一化坐标（0–1，y 向下）。禁止随机/实时数据。
 * 几何由 buildSquatPose 从「膝角 + 躯干角」反推，保证与 angles.ts 自洽，
 * 供 M1-T4 validate / M1-T5 phase / M1-T6 repCounter 复用。
 *
 * 真源：docs/VERIFICATION.md §3、docs/exercises/squat-rules.md。
 */

import { LandmarkIndex, type Fixture, type Landmark, type Pose } from "../types.js";

interface Vec2 {
  x: number;
  y: number;
}

function rotate(v: Vec2, deg: number): Vec2 {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

const SHIN = 0.2;
const THIGH = 0.2;
const TORSO = 0.26;

/**
 * 从膝角（髋-膝-踝）反推侧面下肢；躯干用相对竖直的前倾角放置肩。
 * torsoLeanDeg：0 = 直立，正值 = 向前倾（朝膝方向）；默认 20°。
 * leftKneeDx：左膝在冠状面向内偏移的近似（用于 knee-valgus 夹具）。
 */
export function buildSquatPose(opts: {
  kneeDeg: number;
  /** @deprecated 旧「肩-髋-膝」角；若提供 torsoLeanDeg 则忽略。 */
  torsoDeg?: number;
  /** 躯干相对竖直的前倾角（度）。 */
  torsoLeanDeg?: number;
  leftKneeDx?: number;
}): Pose {
  const {
    kneeDeg,
    torsoLeanDeg = opts.torsoDeg != null ? undefined : 20,
    leftKneeDx = 0,
  } = opts;
  const ankle: Vec2 = { x: 0.5, y: 0.9 };
  const knee: Vec2 = { x: 0.5, y: ankle.y - SHIN };

  // 大腿方向：与「向下的小腿」夹角 = kneeDeg，向后上方
  const kr = (kneeDeg * Math.PI) / 180;
  const thighDir: Vec2 = { x: -Math.sin(kr), y: Math.cos(kr) };
  const hip: Vec2 = {
    x: knee.x + THIGH * thighDir.x,
    y: knee.y + THIGH * thighDir.y,
  };

  let shoulder: Vec2;
  if (torsoLeanDeg != null) {
    const lr = (torsoLeanDeg * Math.PI) / 180;
    // 前倾：肩相对竖直偏向膝所在的 -x
    shoulder = {
      x: hip.x - TORSO * Math.sin(lr),
      y: hip.y - TORSO * Math.cos(lr),
    };
  } else {
    // 兼容旧 torsoDeg（肩-髋-膝）构造
    const torsoDeg = opts.torsoDeg ?? 170;
    const hipToKnee: Vec2 = { x: knee.x - hip.x, y: knee.y - hip.y };
    const c1 = rotate(hipToKnee, torsoDeg);
    const c2 = rotate(hipToKnee, -torsoDeg);
    const pick = c1.y < c2.y ? c1 : c2;
    const norm = Math.hypot(pick.x, pick.y) || 1;
    shoulder = {
      x: hip.x + (TORSO * pick.x) / norm,
      y: hip.y + (TORSO * pick.y) / norm,
    };
  }

  const lm = (v: Vec2): Landmark => ({ x: v.x, y: v.y, visibility: 1 });
  const pose: Pose = [];
  pose[LandmarkIndex.LeftShoulder] = lm(shoulder);
  pose[LandmarkIndex.RightShoulder] = lm(shoulder);
  pose[LandmarkIndex.LeftHip] = lm(hip);
  pose[LandmarkIndex.RightHip] = lm(hip);
  pose[LandmarkIndex.LeftKnee] = lm({ x: knee.x + leftKneeDx, y: knee.y });
  pose[LandmarkIndex.RightKnee] = lm(knee);
  pose[LandmarkIndex.LeftAnkle] = lm(ankle);
  pose[LandmarkIndex.RightAnkle] = lm(ankle);
  return pose;
}

/** 重复每一相位若干帧，供 5 帧确认的相位状态机使用。 */
function repeatFrames(pose: Pose, frames: number): Pose[] {
  return Array.from({ length: frames }, () => pose);
}

const FX_SQUAT_STAND: Fixture = {
  id: "FX-SQUAT-STAND",
  description: "站立，膝角约 175°，躯干近直立",
  pose: buildSquatPose({ kneeDeg: 175, torsoLeanDeg: 8 }),
  expectedStatus: "correct",
  expectedRuleIds: [],
};

const FX_SQUAT_BOTTOM_OK: Fixture = {
  id: "FX-SQUAT-BOTTOM-OK",
  description: "底部，膝角约 85°，正常前倾约 28°",
  pose: buildSquatPose({ kneeDeg: 85, torsoLeanDeg: 28 }),
  expectedStatus: "correct",
  expectedRuleIds: [],
};

const FX_SQUAT_SHALLOW: Fixture = {
  id: "FX-SQUAT-SHALLOW",
  description: "强制 bottom 相位下膝角约 112°（≥110 触发 squat-depth）",
  pose: buildSquatPose({ kneeDeg: 112, torsoLeanDeg: 25 }),
  expectedStatus: "error",
  expectedRuleIds: ["squat-depth"],
};

const FX_SQUAT_VALGUS_L: Fixture = {
  id: "FX-SQUAT-VALGUS-L",
  description: "左膝几何内扣姿态（侧摄 MVP 规则禁用，不期望触发）",
  pose: buildSquatPose({ kneeDeg: 88, torsoLeanDeg: 28, leftKneeDx: 0.16 }),
  expectedStatus: "correct",
  expectedRuleIds: [],
};

const FX_SQUAT_LEAN: Fixture = {
  id: "FX-SQUAT-LEAN",
  description: "站立时躯干前倾过多（相对竖直约 62°，>55 触发 warning；仅 stand 评估）",
  pose: buildSquatPose({ kneeDeg: 175, torsoLeanDeg: 62 }),
  expectedStatus: "warning",
  expectedRuleIds: ["torso-upright"],
};

const FX_SEQ_5REPS: Fixture = {
  id: "FX-SEQ-5REPS",
  description: "5 次完整相位序列（stand→descend→bottom→ascend→stand）",
  sequence: Array.from({ length: 5 }).flatMap(() => [
    ...repeatFrames(buildSquatPose({ kneeDeg: 175, torsoLeanDeg: 8 }), 6),
    ...repeatFrames(buildSquatPose({ kneeDeg: 130, torsoLeanDeg: 22 }), 6),
    ...repeatFrames(buildSquatPose({ kneeDeg: 85, torsoLeanDeg: 28 }), 6),
    ...repeatFrames(buildSquatPose({ kneeDeg: 130, torsoLeanDeg: 22 }), 6),
    ...repeatFrames(buildSquatPose({ kneeDeg: 175, torsoLeanDeg: 8 }), 6),
  ]),
  expectedRepCount: 5,
};

/** 全部夹具，按 ID 索引（VT-P1-010 遍历检查）。 */
export const FIXTURES: Record<string, Fixture> = {
  [FX_SQUAT_STAND.id]: FX_SQUAT_STAND,
  [FX_SQUAT_BOTTOM_OK.id]: FX_SQUAT_BOTTOM_OK,
  [FX_SQUAT_SHALLOW.id]: FX_SQUAT_SHALLOW,
  [FX_SQUAT_VALGUS_L.id]: FX_SQUAT_VALGUS_L,
  [FX_SQUAT_LEAN.id]: FX_SQUAT_LEAN,
  [FX_SEQ_5REPS.id]: FX_SEQ_5REPS,
};

export {
  FX_SQUAT_STAND,
  FX_SQUAT_BOTTOM_OK,
  FX_SQUAT_SHALLOW,
  FX_SQUAT_VALGUS_L,
  FX_SQUAT_LEAN,
  FX_SEQ_5REPS,
};
