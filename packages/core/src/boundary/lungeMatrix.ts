/**
 * 弓步边界矩阵（VT-RB-001/002/004 / FR-088）。
 * 边沿与 docs/exercises/lunge-rules.md 0.1.0 一致。
 * lunge-depth：目标工作膝 <100°，容差 10° → 测量角 ≥110° 才报。
 * torso-upright：仅 stand；前倾 >55° 才 warning。
 */

import { buildSquatPose } from "../fixtures/index.js";
import { lungeWorkingKneeAngle } from "../phase.js";
import { torsoLeanFromVertical } from "../validate.js";
import {
  buildSquatNearKneeMeasured,
  buildSquatNearLeanMeasured,
} from "./poseTune.js";
import type { BoundaryCase, SweepSpec } from "./types.js";

const EX = "lunge";

export const LUNGE_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "LN-DEPTH-OK",
    exerciseId: EX,
    ruleId: "lunge-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildSquatPose({ kneeDeg: 85, torsoLeanDeg: 22 }),
    description: "前膝约直角，明确够深",
    expectTriggered: false,
    expectStatus: "correct",
  },
  {
    id: "LN-DEPTH-CRIT-OK",
    exerciseId: EX,
    ruleId: "lunge-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildSquatNearKneeMeasured(109.5, { torsoLeanDeg: 22 }),
    description: "实测工作膝≈109.5°：阈值内侧",
    expectTriggered: false,
  },
  {
    id: "LN-DEPTH-CRIT-FAULT",
    exerciseId: EX,
    ruleId: "lunge-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildSquatNearKneeMeasured(110.5, { torsoLeanDeg: 22 }),
    description: "实测工作膝≈110.5°：阈值外侧",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "LN-DEPTH-VIOLATION",
    exerciseId: EX,
    ruleId: "lunge-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildSquatPose({ kneeDeg: 125, torsoLeanDeg: 18 }),
    description: "明显浅弓底部",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "LN-DEPTH-PHASE-OFF",
    exerciseId: EX,
    ruleId: "lunge-depth",
    kind: "phase_off",
    phase: "stand",
    pose: buildSquatPose({ kneeDeg: 130, torsoLeanDeg: 12 }),
    description: "站立相位不评估深度",
    expectTriggered: false,
    expectRuleAbsent: true,
  },

  {
    id: "LN-TORSO-OK",
    exerciseId: EX,
    ruleId: "torso-upright",
    kind: "ok",
    phase: "stand",
    pose: buildSquatPose({ kneeDeg: 165, torsoLeanDeg: 20 }),
    description: "分腿站立正常前倾",
    expectTriggered: false,
    expectStatus: "correct",
  },
  {
    id: "LN-TORSO-CRIT-OK",
    exerciseId: EX,
    ruleId: "torso-upright",
    kind: "critical_ok",
    phase: "stand",
    pose: buildSquatNearLeanMeasured(54.5),
    description: "实测前倾≈54.5°：阈值内侧",
    expectTriggered: false,
  },
  {
    id: "LN-TORSO-CRIT-FAULT",
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
    id: "LN-TORSO-VIOLATION",
    exerciseId: EX,
    ruleId: "torso-upright",
    kind: "violation",
    phase: "stand",
    pose: buildSquatPose({ kneeDeg: 165, torsoLeanDeg: 70 }),
    description: "站立明显弯腰",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "LN-TORSO-PHASE-OFF",
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
];

export const LUNGE_SWEEPS: SweepSpec[] = [
  {
    id: "LN-SWEEP-DEPTH",
    exerciseId: EX,
    ruleId: "lunge-depth",
    phase: "bottom",
    description: "工作膝扫区：测量角 ≥110 才触发 lunge-depth",
    samples: Array.from({ length: 21 }, (_, i) => {
      const kneeIn = 100 + i;
      const pose = buildSquatPose({ kneeDeg: kneeIn, torsoLeanDeg: 22 });
      const measured = lungeWorkingKneeAngle(pose) ?? kneeIn;
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
    id: "LN-SWEEP-TORSO",
    exerciseId: EX,
    ruleId: "torso-upright",
    phase: "stand",
    description: "前倾扫区：测量角 >55 才触发 torso-upright",
    samples: Array.from({ length: 21 }, (_, i) => {
      const leanIn = 45 + i;
      const pose = buildSquatPose({ kneeDeg: 165, torsoLeanDeg: leanIn });
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
