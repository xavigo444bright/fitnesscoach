/**
 * 深蹲边界矩阵（RULE-BOUNDARY 参考实现）。
 * 边沿与 docs/exercises/squat-rules.md / docs/RULE-BOUNDARY.md §5 一致。
 * critical_* 用实测角标定（poseTune），避免 builder 输入角 ≠ jointAngle。
 */

import { buildSquatPose } from "../fixtures/index.js";
import { squatKneeAngle } from "../phase.js";
import { torsoLeanFromVertical } from "../validate.js";
import {
  buildSquatNearKneeMeasured,
  buildSquatNearLeanMeasured,
} from "./poseTune.js";
import type { BoundaryCase, SweepSpec } from "./types.js";

const EX = "squat";

/** 深蹲全部边界用例（VT-RB-001）。 */
export const SQUAT_BOUNDARY_CASES: BoundaryCase[] = [
  // —— squat-depth（bottom；测量膝角 ≥110 触发）——
  {
    id: "SQ-DEPTH-OK",
    exerciseId: EX,
    ruleId: "squat-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildSquatPose({ kneeDeg: 85, torsoLeanDeg: 28 }),
    description: "平行蹲底部，明确够深",
    expectTriggered: false,
    expectStatus: "correct",
  },
  {
    id: "SQ-DEPTH-CRIT-OK",
    exerciseId: EX,
    ruleId: "squat-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildSquatNearKneeMeasured(109.5, { torsoLeanDeg: 25 }),
    description: "实测膝角≈109.5°：阈值内侧，不报深度",
    expectTriggered: false,
  },
  {
    id: "SQ-DEPTH-CRIT-FAULT",
    exerciseId: EX,
    ruleId: "squat-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildSquatNearKneeMeasured(110.5, { torsoLeanDeg: 25 }),
    description: "实测膝角≈110.5°：阈值外侧，报深度",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "SQ-DEPTH-VIOLATION",
    exerciseId: EX,
    ruleId: "squat-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildSquatPose({ kneeDeg: 125, torsoLeanDeg: 22 }),
    description: "明显半蹲底部",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "SQ-DEPTH-PHASE-OFF",
    exerciseId: EX,
    ruleId: "squat-depth",
    kind: "phase_off",
    phase: "descend",
    pose: buildSquatPose({ kneeDeg: 125, torsoLeanDeg: 22 }),
    description: "半蹲姿态但在 descend：不评估 depth",
    expectTriggered: false,
    expectRuleAbsent: true,
  },

  // —— torso-upright（stand；实测前倾 >55 触发）——
  {
    id: "SQ-TORSO-OK",
    exerciseId: EX,
    ruleId: "torso-upright",
    kind: "ok",
    phase: "stand",
    pose: buildSquatPose({ kneeDeg: 175, torsoLeanDeg: 20 }),
    description: "站立正常前倾",
    expectTriggered: false,
    expectStatus: "correct",
  },
  {
    id: "SQ-TORSO-CRIT-OK",
    exerciseId: EX,
    ruleId: "torso-upright",
    kind: "critical_ok",
    phase: "stand",
    pose: buildSquatNearLeanMeasured(54.5),
    description: "实测前倾≈54.5°：阈值内侧，不报",
    expectTriggered: false,
  },
  {
    id: "SQ-TORSO-CRIT-FAULT",
    exerciseId: EX,
    ruleId: "torso-upright",
    kind: "critical_fault",
    phase: "stand",
    pose: buildSquatNearLeanMeasured(55.5),
    description: "实测前倾≈55.5°：阈值外侧，warning",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "SQ-TORSO-VIOLATION",
    exerciseId: EX,
    ruleId: "torso-upright",
    kind: "violation",
    phase: "stand",
    pose: buildSquatPose({ kneeDeg: 175, torsoLeanDeg: 70 }),
    description: "站立明显弯腰",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "SQ-TORSO-PHASE-OFF",
    exerciseId: EX,
    ruleId: "torso-upright",
    kind: "phase_off",
    phase: "bottom",
    pose: buildSquatPose({ kneeDeg: 85, torsoLeanDeg: 62 }),
    description: "底部自然前倾大：不评估 torso",
    expectTriggered: false,
    expectRuleAbsent: true,
    expectStatus: "correct",
  },

  // —— knee-valgus 侧摄禁用 ——
  {
    id: "SQ-VALGUS-L-DISABLED",
    exerciseId: EX,
    ruleId: "knee-valgus-l",
    kind: "disabled",
    phase: "bottom",
    pose: buildSquatPose({
      kneeDeg: 88,
      torsoLeanDeg: 28,
      leftKneeDx: 0.16,
    }),
    description: "几何像内扣，侧摄 MVP 恒不触发",
    expectTriggered: false,
    expectStatus: "correct",
  },
];

/**
 * 连续角度扫边沿（VT-RB-002）。
 * expectTriggered 按**测量角**与 rules.md 边沿对齐，不按 builder 输入角。
 */
export const SQUAT_SWEEPS: SweepSpec[] = [
  {
    id: "SQ-SWEEP-DEPTH",
    exerciseId: EX,
    ruleId: "squat-depth",
    phase: "bottom",
    description: "膝角扫区：测量角 ≥110 才触发 squat-depth",
    samples: Array.from({ length: 21 }, (_, i) => {
      const kneeIn = 100 + i;
      const pose = buildSquatPose({ kneeDeg: kneeIn, torsoLeanDeg: 25 });
      const measured = squatKneeAngle(pose) ?? kneeIn;
      return {
        label: `in=${kneeIn} meas=${measured.toFixed(2)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 110,
      };
    }),
  },
  {
    id: "SQ-SWEEP-TORSO",
    exerciseId: EX,
    ruleId: "torso-upright",
    phase: "stand",
    description: "前倾扫区：测量角 >55 才触发 torso-upright",
    samples: Array.from({ length: 21 }, (_, i) => {
      const leanIn = 45 + i;
      const pose = buildSquatPose({ kneeDeg: 175, torsoLeanDeg: leanIn });
      const measured = torsoLeanFromVertical(pose) ?? leanIn;
      return {
        label: `in=${leanIn} meas=${measured.toFixed(2)}`,
        pose,
        phase: "stand" as const,
        valueDeg: measured,
        expectTriggered: measured > 55,
      };
    }),
  },
];
