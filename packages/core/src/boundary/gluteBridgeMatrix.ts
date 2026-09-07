/**
 * 臀桥边界矩阵（VT-RB-001/002/004 / FR-088）。
 * 边沿与 docs/exercises/glute-bridge-rules.md 0.2.1 一致。
 * hip-extension：目标髋伸 ≥140°，容差 10° → 测量角 <130° 才报。
 */

import { buildGluteBridgePose } from "../fixtures/gluteBridge.js";
import { gluteBridgeHipAngle } from "../phase.js";
import { buildGluteBridgeNearHipMeasured } from "./poseTune.js";
import type { BoundaryCase, SweepSpec } from "./types.js";

const EX = "glute-bridge";

export const GLUTE_BRIDGE_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "GB-HIP-OK",
    exerciseId: EX,
    ruleId: "hip-extension",
    kind: "ok",
    phase: "bottom",
    pose: buildGluteBridgePose({ hipDeg: 165 }),
    description: "顶峰肩膝近一线",
    expectTriggered: false,
  },
  {
    id: "GB-HIP-CRIT-OK",
    exerciseId: EX,
    ruleId: "hip-extension",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildGluteBridgeNearHipMeasured(130.5),
    description: "实测髋伸≈130.5°：阈值内侧",
    expectTriggered: false,
  },
  {
    id: "GB-HIP-CRIT-FAULT",
    exerciseId: EX,
    ruleId: "hip-extension",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildGluteBridgeNearHipMeasured(129.2),
    description: "实测髋伸≈129.2°：阈值外侧",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "GB-HIP-VIOLATION",
    exerciseId: EX,
    ruleId: "hip-extension",
    kind: "violation",
    phase: "bottom",
    pose: buildGluteBridgePose({ hipDeg: 125 }),
    description: "顶峰明显未锁髋（强制 bottom）",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "GB-HIP-PHASE-OFF",
    exerciseId: EX,
    ruleId: "hip-extension",
    kind: "phase_off",
    phase: "stand",
    pose: buildGluteBridgePose({ hipDeg: 125 }),
    description: "静息相位不评估顶髋",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const GLUTE_BRIDGE_SWEEPS: SweepSpec[] = [
  {
    id: "GB-SWEEP-HIP",
    exerciseId: EX,
    ruleId: "hip-extension",
    phase: "bottom",
    description: "髋伸扫区：测量角 <130 触发 hip-extension",
    samples: Array.from({ length: 31 }, (_, i) => {
      const hipIn = 115 + i;
      const pose = buildGluteBridgePose({ hipDeg: hipIn });
      const measured = gluteBridgeHipAngle(pose) ?? hipIn;
      return {
        label: `in=${hipIn} meas=${measured.toFixed(2)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured < 130,
      };
    }),
  },
];
