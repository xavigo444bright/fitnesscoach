/**
 * 俯卧撑边界矩阵（VT-RB-001/002 / FR-011）。
 * 边沿与 docs/exercises/pushup-rules.md 0.2.1 一致。
 */

import { buildPushupPose } from "../fixtures/pushup.js";
import { pushupElbowAngle } from "../phase.js";
import { pushupBodyLineDeg } from "../validate.js";
import {
  buildPushupNearBodyLineMeasured,
  buildPushupNearElbowMeasured,
} from "./poseTune.js";
import type { BoundaryCase, SweepSpec } from "./types.js";

const EX = "pushup";

export const PUSHUP_BOUNDARY_CASES: BoundaryCase[] = [
  // —— elbow-depth（bottom；≥120 触发）——
  {
    id: "PU-ELBOW-OK",
    exerciseId: EX,
    ruleId: "elbow-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 100 }),
    description: "底部肘角够深",
    expectTriggered: false,
  },
  {
    id: "PU-ELBOW-CRIT-OK",
    exerciseId: EX,
    ruleId: "elbow-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(119.2),
    description: "实测肘角≈119.2°：阈值内侧",
    expectTriggered: false,
  },
  {
    id: "PU-ELBOW-CRIT-FAULT",
    exerciseId: EX,
    ruleId: "elbow-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(120.5),
    description: "实测肘角≈120.5°：阈值外侧",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "PU-ELBOW-VIOLATION",
    exerciseId: EX,
    ruleId: "elbow-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 140 }),
    description: "明显未降到位",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "PU-ELBOW-PHASE-OFF",
    exerciseId: EX,
    ruleId: "elbow-depth",
    kind: "phase_off",
    phase: "stand",
    pose: buildPushupPose({ elbowDeg: 140 }),
    description: "撑起相位不评估肘深",
    expectTriggered: false,
    expectRuleAbsent: true,
  },

  // —— body-line（all；<160 触发）——
  {
    id: "PU-LINE-OK",
    exerciseId: EX,
    ruleId: "body-line",
    kind: "ok",
    phase: "stand",
    pose: buildPushupNearBodyLineMeasured(178, { elbowDeg: 170 }),
    description: "身体近乎一条直线",
    expectTriggered: false,
    expectStatus: "correct",
  },
  {
    id: "PU-LINE-CRIT-OK",
    exerciseId: EX,
    ruleId: "body-line",
    kind: "critical_ok",
    phase: "stand",
    pose: buildPushupNearBodyLineMeasured(160.5, { elbowDeg: 170 }),
    description: "实测一线≈160.5°：阈值内侧",
    expectTriggered: false,
  },
  {
    id: "PU-LINE-CRIT-FAULT",
    exerciseId: EX,
    ruleId: "body-line",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildPushupNearBodyLineMeasured(159, { elbowDeg: 100 }),
    description: "实测一线≈159°：阈值外侧",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "PU-LINE-VIOLATION",
    exerciseId: EX,
    ruleId: "body-line",
    kind: "violation",
    phase: "descend",
    pose: buildPushupNearBodyLineMeasured(140, { elbowDeg: 140 }),
    description: "明显塌腰/撅臀",
    expectTriggered: true,
    expectStatus: "error",
  },
];

export const PUSHUP_SWEEPS: SweepSpec[] = [
  {
    id: "PU-SWEEP-ELBOW",
    exerciseId: EX,
    ruleId: "elbow-depth",
    phase: "bottom",
    description: "肘角扫区：测量角 ≥120 触发 elbow-depth",
    samples: Array.from({ length: 31 }, (_, i) => {
      const elbowIn = 105 + i;
      const pose = buildPushupPose({ elbowDeg: elbowIn, hipDrop: 0 });
      const measured = pushupElbowAngle(pose) ?? elbowIn;
      return {
        label: `in=${elbowIn} meas=${measured.toFixed(2)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 120,
      };
    }),
  },
  {
    id: "PU-SWEEP-LINE",
    exerciseId: EX,
    ruleId: "body-line",
    phase: "stand",
    description: "身体一线扫区：测量角 <160 触发 body-line",
    samples: Array.from({ length: 12 }, (_, i) => {
      const drop = i * 0.04;
      const pose = buildPushupPose({ elbowDeg: 170, hipDrop: drop });
      const measured = pushupBodyLineDeg(pose) ?? 180;
      return {
        label: `drop=${drop.toFixed(2)} meas=${measured.toFixed(2)}`,
        pose,
        phase: "stand" as const,
        valueDeg: measured,
        expectTriggered: measured < 160,
      };
    }),
  },
];
