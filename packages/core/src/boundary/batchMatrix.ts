/**
 * 平板/划船/推举/卧推边界矩阵（VT-RB-001/002/004 / FR-088）。
 */
import { buildPushupPose } from "../fixtures/pushup.js";
import { buildDbFlyPose } from "../fixtures/dbFly.js";
import { buildRaisePose } from "../fixtures/raise.js";
import { buildSquatPose } from "../fixtures/index.js";
import {
  dbFlyDriveDeg,
  dbRowWorkingElbowAngle,
  meanVisibleElbowAngle,
  preferredVisibleElbowAngle,
  plankBodyLineDeg,
  pullupWorkingElbowAngle,
  rdlHipAngle,
  lateralRaiseDriveDeg,
  shoulderRaiseDriveDeg,
} from "../phase.js";
import { LandmarkIndex, type Pose } from "../types.js";
import { pushupBodyLineDeg, torsoLeanFromVertical } from "../validate.js";
import {
  buildDbFlyNearDriveMeasured,
  buildPlankNearPikeLineMeasured,
  buildPushupNearBodyLineMeasured,
  buildPushupNearElbowMeasured,
  buildRaiseNearDriveMeasured,
  buildRdlNearHipMeasured,
  buildSquatNearLeanMeasured,
} from "./poseTune.js";
import type { BoundaryCase, SweepSpec } from "./types.js";

export const PLANK_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "PK-LINE-OK",
    exerciseId: "plank",
    ruleId: "body-line",
    kind: "ok",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 165, hipDrop: 0 }),
    description: "肩髋踝一线",
    expectTriggered: false,
    expectStatus: "correct",
  },
  {
    id: "PK-LINE-CRIT-OK",
    exerciseId: "plank",
    ruleId: "body-line",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildPlankNearPikeLineMeasured(160.5),
    description: "撅臀一线≈160.5° 阈值内侧",
    expectTriggered: false,
  },
  {
    id: "PK-LINE-CRIT-FAULT",
    exerciseId: "plank",
    ruleId: "body-line",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildPlankNearPikeLineMeasured(159.2),
    description: "撅臀一线≈159.2° 阈值外侧",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "PK-LINE-VIOLATION",
    exerciseId: "plank",
    ruleId: "body-line",
    kind: "violation",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 165, hipDrop: -0.28 }),
    description: "明显撅臀",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "PK-LINE-CLOTH-OK",
    exerciseId: "plank",
    ruleId: "body-line",
    kind: "ok",
    phase: "bottom",
    pose: buildPushupPose({
      elbowDeg: 165,
      hipDrop: 0.22,
      kneeDrop: 0.2,
    }),
    description: "衣裤拖地：髋膝都垂向支撑面",
    expectTriggered: false,
    expectStatus: "correct",
  },
  {
    id: "PK-LINE-PIKE",
    exerciseId: "plank",
    ruleId: "body-line",
    kind: "violation",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 165, hipDrop: -0.28 }),
    description: "撅臀：髋离开支撑面",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "PK-LINE-PHASE-OFF",
    exerciseId: "plank",
    ruleId: "body-line",
    kind: "phase_off",
    phase: "stand",
    pose: buildPushupPose({ elbowDeg: 165, hipDrop: -0.28 }),
    description: "未撑稳相位不评估一线",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const PLANK_SWEEPS: SweepSpec[] = [
  {
    id: "PK-SWEEP-LINE",
    exerciseId: "plank",
    ruleId: "body-line",
    phase: "bottom",
    description: "撅臀扫区：测量角 <160 触发 body-line",
    samples: Array.from({ length: 21 }, (_, i) => {
      const hipDrop = -0.02 * i;
      const pose = buildPushupPose({
        elbowDeg: 165,
        hipDrop,
      });
      const measured = plankBodyLineDeg(pose) ?? 180;
      return {
        label: `drop=${hipDrop.toFixed(2)} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured < 160,
      };
    }),
  },
];

export const DB_ROW_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "RW-DEPTH-OK",
    exerciseId: "db-row",
    ruleId: "row-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 85 }),
    description: "肘收到髋侧",
    expectTriggered: false,
  },
  {
    id: "RW-DEPTH-CRIT-OK",
    exerciseId: "db-row",
    ruleId: "row-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(109.5),
    description: "工作肘≈109.5°",
    expectTriggered: false,
  },
  {
    id: "RW-DEPTH-CRIT-FAULT",
    exerciseId: "db-row",
    ruleId: "row-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(110.5),
    description: "工作肘≈110.5°",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "RW-DEPTH-VIOLATION",
    exerciseId: "db-row",
    ruleId: "row-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 130 }),
    description: "明显没拉上去",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "RW-DEPTH-PHASE-OFF",
    exerciseId: "db-row",
    ruleId: "row-depth",
    kind: "phase_off",
    phase: "stand",
    pose: buildPushupPose({ elbowDeg: 130 }),
    description: "悬垂相位不评估深度",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const DB_ROW_SWEEPS: SweepSpec[] = [
  {
    id: "RW-SWEEP-DEPTH",
    exerciseId: "db-row",
    ruleId: "row-depth",
    phase: "bottom",
    description: "工作肘 ≥110 触发 row-depth",
    samples: Array.from({ length: 21 }, (_, i) => {
      const elbowIn = 100 + i;
      const pose = buildPushupPose({ elbowDeg: elbowIn });
      const measured = dbRowWorkingElbowAngle(pose) ?? elbowIn;
      return {
        label: `in=${elbowIn} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 110,
      };
    }),
  },
];

export const OHP_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "OH-TORSO-OK",
    exerciseId: "ohp",
    ruleId: "torso-upright",
    kind: "ok",
    phase: "stand",
    pose: buildSquatPose({ kneeDeg: 175, torsoLeanDeg: 20 }),
    description: "锁肘时躯干稳定",
    expectTriggered: false,
  },
  {
    id: "OH-TORSO-CRIT-OK",
    exerciseId: "ohp",
    ruleId: "torso-upright",
    kind: "critical_ok",
    phase: "stand",
    pose: buildSquatNearLeanMeasured(54.5),
    description: "前倾/后仰≈54.5°",
    expectTriggered: false,
  },
  {
    id: "OH-TORSO-CRIT-FAULT",
    exerciseId: "ohp",
    ruleId: "torso-upright",
    kind: "critical_fault",
    phase: "stand",
    pose: buildSquatNearLeanMeasured(55.5),
    description: "≈55.5° warning",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "OH-TORSO-VIOLATION",
    exerciseId: "ohp",
    ruleId: "torso-upright",
    kind: "violation",
    phase: "stand",
    pose: buildSquatPose({ kneeDeg: 175, torsoLeanDeg: 70 }),
    description: "明显仰腰",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "OH-TORSO-PHASE-OFF",
    exerciseId: "ohp",
    ruleId: "torso-upright",
    kind: "phase_off",
    phase: "bottom",
    pose: buildSquatPose({ kneeDeg: 175, torsoLeanDeg: 70 }),
    description: "托铃相位不评估躯干",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const OHP_SWEEPS: SweepSpec[] = [
  {
    id: "OH-SWEEP-TORSO",
    exerciseId: "ohp",
    ruleId: "torso-upright",
    phase: "stand",
    description: "前倾 >55 触发 torso-upright",
    samples: Array.from({ length: 21 }, (_, i) => {
      const leanIn = 45 + i;
      const pose = buildSquatPose({ kneeDeg: 175, torsoLeanDeg: leanIn });
      const measured = torsoLeanFromVertical(pose) ?? leanIn;
      return {
        label: `in=${leanIn} meas=${measured.toFixed(1)}`,
        pose,
        phase: "stand" as const,
        valueDeg: measured,
        expectTriggered: measured > 55,
      };
    }),
  },
];

export const BENCH_PRESS_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "BP-DEPTH-OK",
    exerciseId: "bench-press",
    ruleId: "elbow-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 95 }),
    description: "触胸",
    expectTriggered: false,
  },
  {
    id: "BP-DEPTH-CRIT-OK",
    exerciseId: "bench-press",
    ruleId: "elbow-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(119.5),
    description: "肘≈119.5°",
    expectTriggered: false,
  },
  {
    id: "BP-DEPTH-CRIT-FAULT",
    exerciseId: "bench-press",
    ruleId: "elbow-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(120.5),
    description: "肘≈120.5°",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "BP-DEPTH-VIOLATION",
    exerciseId: "bench-press",
    ruleId: "elbow-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 140 }),
    description: "明显半程",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "BP-DEPTH-PHASE-OFF",
    exerciseId: "bench-press",
    ruleId: "elbow-depth",
    kind: "phase_off",
    phase: "stand",
    pose: buildPushupPose({ elbowDeg: 140 }),
    description: "锁肘相位不评估深度",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const BENCH_PRESS_SWEEPS: SweepSpec[] = [
  {
    id: "BP-SWEEP-DEPTH",
    exerciseId: "bench-press",
    ruleId: "elbow-depth",
    phase: "bottom",
    description: "肘角 ≥120 触发 elbow-depth",
    samples: Array.from({ length: 21 }, (_, i) => {
      const elbowIn = 110 + i;
      const pose = buildPushupPose({ elbowDeg: elbowIn });
      const measured = meanVisibleElbowAngle(pose) ?? elbowIn;
      return {
        label: `in=${elbowIn} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 120,
      };
    }),
  },
];

export const RDL_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "RDL-DEPTH-OK",
    exerciseId: "rdl",
    ruleId: "rdl-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildRdlNearHipMeasured(100),
    description: "铰链到底",
    expectTriggered: false,
  },
  {
    id: "RDL-DEPTH-CRIT-OK",
    exerciseId: "rdl",
    ruleId: "rdl-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildRdlNearHipMeasured(124.5),
    description: "髋≈124.5°",
    expectTriggered: false,
  },
  {
    id: "RDL-DEPTH-CRIT-FAULT",
    exerciseId: "rdl",
    ruleId: "rdl-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildRdlNearHipMeasured(125.5),
    description: "髋≈125.5°",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "RDL-DEPTH-VIOLATION",
    exerciseId: "rdl",
    ruleId: "rdl-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildRdlNearHipMeasured(145),
    description: "明显没铰到位",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "RDL-DEPTH-PHASE-OFF",
    exerciseId: "rdl",
    ruleId: "rdl-depth",
    kind: "phase_off",
    phase: "stand",
    pose: buildRdlNearHipMeasured(145),
    description: "锁髋相位不评估深度",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const RDL_SWEEPS: SweepSpec[] = [
  {
    id: "RDL-SWEEP-DEPTH",
    exerciseId: "rdl",
    ruleId: "rdl-depth",
    phase: "bottom",
    description: "髋角 ≥125 触发 rdl-depth",
    samples: Array.from({ length: 21 }, (_, i) => {
      const hipIn = 115 + i;
      const pose = buildRdlNearHipMeasured(hipIn);
      const measured = rdlHipAngle(pose) ?? hipIn;
      return {
        label: `in=${hipIn} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 125,
      };
    }),
  },
];

export const PULLUP_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "PU-DEPTH-OK",
    exerciseId: "pullup",
    ruleId: "pull-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 80 }),
    description: "拉至过杆",
    expectTriggered: false,
  },
  {
    id: "PU-DEPTH-CRIT-OK",
    exerciseId: "pullup",
    ruleId: "pull-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(114.5),
    description: "工作肘≈114.5°",
    expectTriggered: false,
  },
  {
    id: "PU-DEPTH-CRIT-FAULT",
    exerciseId: "pullup",
    ruleId: "pull-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(115.5),
    description: "工作肘≈115.5°",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "PU-DEPTH-VIOLATION",
    exerciseId: "pullup",
    ruleId: "pull-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 140 }),
    description: "明显半程",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "PU-DEPTH-PHASE-OFF",
    exerciseId: "pullup",
    ruleId: "pull-depth",
    kind: "phase_off",
    phase: "stand",
    pose: buildPushupPose({ elbowDeg: 140 }),
    description: "悬垂相位不评估深度",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const PULLUP_SWEEPS: SweepSpec[] = [
  {
    id: "PU-SWEEP-DEPTH",
    exerciseId: "pullup",
    ruleId: "pull-depth",
    phase: "bottom",
    description: "工作肘 ≥115 触发 pull-depth",
    samples: Array.from({ length: 21 }, (_, i) => {
      const elbowIn = 105 + i;
      const pose = buildPushupPose({ elbowDeg: elbowIn });
      const measured = pullupWorkingElbowAngle(pose) ?? elbowIn;
      return {
        label: `in=${elbowIn} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 115,
      };
    }),
  },
];

export const DB_FLY_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "FLY-DEPTH-OK",
    exerciseId: "db-fly",
    ruleId: "fly-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildDbFlyPose({ wristIncludedDeg: 70 }),
    description: "打开够深",
    expectTriggered: false,
  },
  {
    id: "FLY-DEPTH-CRIT-OK",
    exerciseId: "db-fly",
    ruleId: "fly-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildDbFlyNearDriveMeasured(149.5),
    description: "drive≈149.5°",
    expectTriggered: false,
  },
  {
    id: "FLY-DEPTH-CRIT-FAULT",
    exerciseId: "db-fly",
    ruleId: "fly-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildDbFlyNearDriveMeasured(150.5),
    description: "drive≈150.5°",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "FLY-DEPTH-VIOLATION",
    exerciseId: "db-fly",
    ruleId: "fly-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildDbFlyPose({ wristIncludedDeg: 18 }),
    description: "明显没打开",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "FLY-DEPTH-PHASE-OFF",
    exerciseId: "db-fly",
    ruleId: "fly-depth",
    kind: "phase_off",
    phase: "stand",
    pose: buildDbFlyPose({ wristIncludedDeg: 18 }),
    description: "合拢相位不评估开合深度",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const DB_FLY_SWEEPS: SweepSpec[] = [
  {
    id: "FLY-SWEEP-DEPTH",
    exerciseId: "db-fly",
    ruleId: "fly-depth",
    phase: "bottom",
    description: "drive ≥150 触发 fly-depth",
    samples: Array.from({ length: 21 }, (_, i) => {
      const driveIn = 140 + i;
      const pose = buildDbFlyNearDriveMeasured(driveIn);
      const measured = dbFlyDriveDeg(pose) ?? driveIn;
      return {
        label: `in=${driveIn} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 150,
      };
    }),
  },
];

/** 正面宽肩 + 直立：torso-lean 应关掉（几何门闩，不靠 cameraHint）。 */
function frontishUprightDipPose(): Pose {
  const pose = buildSquatPose({ kneeDeg: 90, torsoLeanDeg: 4 });
  const out = pose.slice();
  const rs = out[LandmarkIndex.RightShoulder];
  if (rs) {
    out[LandmarkIndex.LeftShoulder] = { ...rs, x: rs.x - 0.22 };
  }
  return out;
}

export const DIP_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "DIP-DEPTH-OK",
    exerciseId: "dip",
    ruleId: "dip-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 80 }),
    description: "沉到够深",
    expectTriggered: false,
  },
  {
    id: "DIP-DEPTH-CRIT-OK",
    exerciseId: "dip",
    ruleId: "dip-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(114.5),
    description: "肘≈114.5°",
    expectTriggered: false,
  },
  {
    id: "DIP-DEPTH-CRIT-FAULT",
    exerciseId: "dip",
    ruleId: "dip-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(115.5),
    description: "肘≈115.5°",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "DIP-DEPTH-VIOLATION",
    exerciseId: "dip",
    ruleId: "dip-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 140 }),
    description: "明显半程",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "DIP-DEPTH-PHASE-OFF",
    exerciseId: "dip",
    ruleId: "dip-depth",
    kind: "phase_off",
    phase: "stand",
    pose: buildPushupPose({ elbowDeg: 140 }),
    description: "锁肘相位不评估深度",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
  {
    id: "DIP-LEAN-OK",
    exerciseId: "dip",
    ruleId: "torso-lean",
    kind: "ok",
    phase: "bottom",
    pose: buildSquatPose({ kneeDeg: 90, torsoLeanDeg: 25 }),
    description: "底部前倾够",
    expectTriggered: false,
  },
  {
    id: "DIP-LEAN-CRIT-OK",
    exerciseId: "dip",
    ruleId: "torso-lean",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildSquatNearLeanMeasured(10.5),
    description: "前倾≈10.5°",
    expectTriggered: false,
  },
  {
    id: "DIP-LEAN-CRIT-FAULT",
    exerciseId: "dip",
    ruleId: "torso-lean",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildSquatNearLeanMeasured(9.5),
    description: "前倾≈9.5°",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "DIP-LEAN-VIOLATION",
    exerciseId: "dip",
    ruleId: "torso-lean",
    kind: "violation",
    phase: "bottom",
    pose: buildSquatPose({ kneeDeg: 90, torsoLeanDeg: 2 }),
    description: "底部几乎直立",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "DIP-LEAN-PHASE-OFF",
    exerciseId: "dip",
    ruleId: "torso-lean",
    kind: "phase_off",
    phase: "stand",
    pose: buildSquatPose({ kneeDeg: 175, torsoLeanDeg: 2 }),
    description: "锁肘相位不评估前倾",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
  {
    id: "DIP-LEAN-FRONT-OFF",
    exerciseId: "dip",
    ruleId: "torso-lean",
    kind: "disabled",
    phase: "bottom",
    pose: frontishUprightDipPose(),
    description: "正面宽肩不评估躯干前倾",
    expectTriggered: false,
  },
];

export const DIP_SWEEPS: SweepSpec[] = [
  {
    id: "DIP-SWEEP-DEPTH",
    exerciseId: "dip",
    ruleId: "dip-depth",
    phase: "bottom",
    description: "肘 ≥115 触发 dip-depth",
    samples: Array.from({ length: 21 }, (_, i) => {
      const elbowIn = 105 + i;
      const pose = buildPushupPose({ elbowDeg: elbowIn });
      const measured = preferredVisibleElbowAngle(pose) ?? elbowIn;
      return {
        label: `in=${elbowIn} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 115,
      };
    }),
  },
  {
    id: "DIP-SWEEP-LEAN",
    exerciseId: "dip",
    ruleId: "torso-lean",
    phase: "bottom",
    description: "前倾 <10 触发 torso-lean",
    samples: Array.from({ length: 21 }, (_, i) => {
      const leanIn = i;
      const pose = buildSquatPose({ kneeDeg: 90, torsoLeanDeg: leanIn });
      const measured = torsoLeanFromVertical(pose) ?? leanIn;
      return {
        label: `in=${leanIn} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured < 10,
      };
    }),
  },
];

function frontishPushupPose(opts: {
  elbowDeg: number;
  hipDrop?: number;
}): Pose {
  const pose = buildPushupPose(opts);
  const out = pose.slice();
  const rs = out[LandmarkIndex.RightShoulder];
  if (rs) {
    out[LandmarkIndex.LeftShoulder] = { ...rs, x: rs.x - 0.22 };
  }
  return out;
}

export const INCLINE_PUSHUP_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "IPU-ELBOW-OK",
    exerciseId: "incline-pushup",
    ruleId: "elbow-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 100 }),
    description: "胸口够近支撑面",
    expectTriggered: false,
  },
  {
    id: "IPU-ELBOW-CRIT-OK",
    exerciseId: "incline-pushup",
    ruleId: "elbow-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(119.2),
    description: "肘≈119.2°",
    expectTriggered: false,
  },
  {
    id: "IPU-ELBOW-CRIT-FAULT",
    exerciseId: "incline-pushup",
    ruleId: "elbow-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(120.5),
    description: "肘≈120.5°",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "IPU-ELBOW-VIOLATION",
    exerciseId: "incline-pushup",
    ruleId: "elbow-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 140 }),
    description: "明显半程",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "IPU-ELBOW-PHASE-OFF",
    exerciseId: "incline-pushup",
    ruleId: "elbow-depth",
    kind: "phase_off",
    phase: "stand",
    pose: buildPushupPose({ elbowDeg: 140 }),
    description: "撑起相位不评估肘深",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
  {
    id: "IPU-ELBOW-FRONT-OFF",
    exerciseId: "incline-pushup",
    ruleId: "elbow-depth",
    kind: "disabled",
    phase: "bottom",
    pose: frontishPushupPose({ elbowDeg: 140 }),
    description: "正面宽肩不评估肘深",
    expectTriggered: false,
  },
  {
    id: "IPU-LINE-OK",
    exerciseId: "incline-pushup",
    ruleId: "body-line",
    kind: "ok",
    phase: "stand",
    pose: buildPushupPose({ elbowDeg: 170, hipDrop: 0 }),
    description: "身体一线",
    expectTriggered: false,
    expectStatus: "correct",
  },
  {
    id: "IPU-LINE-CRIT-OK",
    exerciseId: "incline-pushup",
    ruleId: "body-line",
    kind: "critical_ok",
    phase: "stand",
    pose: buildPushupNearBodyLineMeasured(160.5, { elbowDeg: 170 }),
    description: "一线≈160.5°",
    expectTriggered: false,
  },
  {
    id: "IPU-LINE-CRIT-FAULT",
    exerciseId: "incline-pushup",
    ruleId: "body-line",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildPushupNearBodyLineMeasured(159, { elbowDeg: 100 }),
    description: "一线≈159°",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "IPU-LINE-VIOLATION",
    exerciseId: "incline-pushup",
    ruleId: "body-line",
    kind: "violation",
    phase: "descend",
    pose: buildPushupPose({ elbowDeg: 165, hipDrop: -0.28 }),
    description: "明显撅臀",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "IPU-LINE-FRONT-OFF",
    exerciseId: "incline-pushup",
    ruleId: "body-line",
    kind: "disabled",
    phase: "bottom",
    pose: frontishPushupPose({ elbowDeg: 165, hipDrop: -0.28 }),
    description: "正面宽肩不评估一线",
    expectTriggered: false,
  },
];

export const INCLINE_PUSHUP_SWEEPS: SweepSpec[] = [
  {
    id: "IPU-SWEEP-ELBOW",
    exerciseId: "incline-pushup",
    ruleId: "elbow-depth",
    phase: "bottom",
    description: "肘 ≥120 触发 elbow-depth",
    samples: Array.from({ length: 21 }, (_, i) => {
      const elbowIn = 110 + i;
      const pose = buildPushupPose({ elbowDeg: elbowIn });
      const measured = meanVisibleElbowAngle(pose) ?? elbowIn;
      return {
        label: `in=${elbowIn} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 120,
      };
    }),
  },
  {
    id: "IPU-SWEEP-LINE",
    exerciseId: "incline-pushup",
    ruleId: "body-line",
    phase: "stand",
    description: "一线 <160 触发 body-line",
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

export const CABLE_CROSSOVER_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "XO-DEPTH-OK",
    exerciseId: "cable-crossover",
    ruleId: "crossover-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildDbFlyPose({ wristIncludedDeg: 110 }),
    description: "打开够开",
    expectTriggered: false,
  },
  {
    id: "XO-DEPTH-CRIT-OK",
    exerciseId: "cable-crossover",
    ruleId: "crossover-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildDbFlyNearDriveMeasured(89.5),
    description: "drive≈89.5°",
    expectTriggered: false,
  },
  {
    id: "XO-DEPTH-CRIT-FAULT",
    exerciseId: "cable-crossover",
    ruleId: "crossover-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildDbFlyNearDriveMeasured(90.5),
    description: "drive≈90.5°",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "XO-DEPTH-VIOLATION",
    exerciseId: "cable-crossover",
    ruleId: "crossover-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildDbFlyPose({ wristIncludedDeg: 40 }),
    description: "明显没打开",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "XO-DEPTH-PHASE-OFF",
    exerciseId: "cable-crossover",
    ruleId: "crossover-depth",
    kind: "phase_off",
    phase: "stand",
    pose: buildDbFlyPose({ wristIncludedDeg: 40 }),
    description: "交汇相位不评估打开深度",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const CABLE_CROSSOVER_SWEEPS: SweepSpec[] = [
  {
    id: "XO-SWEEP-DEPTH",
    exerciseId: "cable-crossover",
    ruleId: "crossover-depth",
    phase: "bottom",
    description: "drive ≥90 触发 crossover-depth",
    samples: Array.from({ length: 21 }, (_, i) => {
      const included = 50 + i * 4;
      const pose = buildDbFlyPose({ wristIncludedDeg: included });
      const measured = dbFlyDriveDeg(pose) ?? 180 - included;
      return {
        label: `inc=${included} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 90,
      };
    }),
  },
];

export const CHEST_PRESS_MACHINE_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "CPM-DEPTH-OK",
    exerciseId: "chest-press-machine",
    ruleId: "press-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 70 }),
    description: "收到胸口",
    expectTriggered: false,
  },
  {
    id: "CPM-DEPTH-CRIT-OK",
    exerciseId: "chest-press-machine",
    ruleId: "press-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(104.5),
    description: "肘≈104.5°",
    expectTriggered: false,
  },
  {
    id: "CPM-DEPTH-CRIT-FAULT",
    exerciseId: "chest-press-machine",
    ruleId: "press-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(105.5),
    description: "肘≈105.5°",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "CPM-DEPTH-VIOLATION",
    exerciseId: "chest-press-machine",
    ruleId: "press-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 130 }),
    description: "明显没收近",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "CPM-DEPTH-PHASE-OFF",
    exerciseId: "chest-press-machine",
    ruleId: "press-depth",
    kind: "phase_off",
    phase: "stand",
    pose: buildPushupPose({ elbowDeg: 130 }),
    description: "推起相位不评估收回深度",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const CHEST_PRESS_MACHINE_SWEEPS: SweepSpec[] = [
  {
    id: "CPM-SWEEP-DEPTH",
    exerciseId: "chest-press-machine",
    ruleId: "press-depth",
    phase: "bottom",
    description: "肘 ≥105 触发 press-depth",
    samples: Array.from({ length: 21 }, (_, i) => {
      const elbowIn = 95 + i;
      const pose = buildPushupPose({ elbowDeg: elbowIn });
      const measured = meanVisibleElbowAngle(pose) ?? elbowIn;
      return {
        label: `in=${elbowIn} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 105,
      };
    }),
  },
];

export const LATERAL_RAISE_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "LR-HEIGHT-OK",
    exerciseId: "lateral-raise",
    ruleId: "raise-height",
    kind: "ok",
    phase: "bottom",
    pose: buildRaisePose({ abductionDeg: 80 }),
    description: "抬至约肩高",
    expectTriggered: false,
  },
  {
    id: "LR-HEIGHT-CRIT-OK",
    exerciseId: "lateral-raise",
    ruleId: "raise-height",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildRaiseNearDriveMeasured(124.5, {
      driveFn: lateralRaiseDriveDeg,
    }),
    description: "drive≈124.5°",
    expectTriggered: false,
  },
  {
    id: "LR-HEIGHT-CRIT-FAULT",
    exerciseId: "lateral-raise",
    ruleId: "raise-height",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildRaiseNearDriveMeasured(125.5, {
      driveFn: lateralRaiseDriveDeg,
    }),
    description: "drive≈125.5°",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "LR-HEIGHT-VIOLATION",
    exerciseId: "lateral-raise",
    ruleId: "raise-height",
    kind: "violation",
    phase: "bottom",
    pose: buildRaisePose({ abductionDeg: 30 }),
    description: "明显没抬到肩高",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "LR-HEIGHT-PHASE-OFF",
    exerciseId: "lateral-raise",
    ruleId: "raise-height",
    kind: "phase_off",
    phase: "stand",
    pose: buildRaisePose({ abductionDeg: 30 }),
    description: "下垂相位不评估高度",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const LATERAL_RAISE_SWEEPS: SweepSpec[] = [
  {
    id: "LR-SWEEP-HEIGHT",
    exerciseId: "lateral-raise",
    ruleId: "raise-height",
    phase: "bottom",
    description: "drive ≥125 触发 raise-height",
    samples: Array.from({ length: 21 }, (_, i) => {
      const abd = 20 + i * 4;
      const pose = buildRaisePose({ abductionDeg: abd });
      const measured = lateralRaiseDriveDeg(pose) ?? 180 - abd;
      return {
        label: `abd=${abd} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 125,
      };
    }),
  },
];

export const FRONT_RAISE_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "FR-HEIGHT-OK",
    exerciseId: "front-raise",
    ruleId: "raise-height",
    kind: "ok",
    phase: "bottom",
    pose: buildRaisePose({ abductionDeg: 80, sideView: true }),
    description: "侧面抬至约肩高",
    expectTriggered: false,
  },
  {
    id: "FR-HEIGHT-CRIT-OK",
    exerciseId: "front-raise",
    ruleId: "raise-height",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildRaiseNearDriveMeasured(124.5, { sideView: true }),
    description: "drive≈124.5°",
    expectTriggered: false,
  },
  {
    id: "FR-HEIGHT-CRIT-FAULT",
    exerciseId: "front-raise",
    ruleId: "raise-height",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildRaiseNearDriveMeasured(125.5, { sideView: true }),
    description: "drive≈125.5°",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "FR-HEIGHT-VIOLATION",
    exerciseId: "front-raise",
    ruleId: "raise-height",
    kind: "violation",
    phase: "bottom",
    pose: buildRaisePose({ abductionDeg: 30, sideView: true }),
    description: "明显没抬到肩高",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "FR-HEIGHT-FRONTISH-OFF",
    exerciseId: "front-raise",
    ruleId: "raise-height",
    kind: "ok",
    phase: "bottom",
    pose: buildRaisePose({ abductionDeg: 30 }),
    description: "偏正关掉 raise-height",
    expectTriggered: false,
  },
  {
    id: "FR-HEIGHT-PHASE-OFF",
    exerciseId: "front-raise",
    ruleId: "raise-height",
    kind: "phase_off",
    phase: "stand",
    pose: buildRaisePose({ abductionDeg: 30, sideView: true }),
    description: "下垂相位不评估高度",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const FRONT_RAISE_SWEEPS: SweepSpec[] = [
  {
    id: "FR-SWEEP-HEIGHT",
    exerciseId: "front-raise",
    ruleId: "raise-height",
    phase: "bottom",
    description: "侧面 drive ≥125 触发 raise-height",
    samples: Array.from({ length: 21 }, (_, i) => {
      const abd = 20 + i * 4;
      const pose = buildRaisePose({ abductionDeg: abd, sideView: true });
      const measured = shoulderRaiseDriveDeg(pose) ?? 180 - abd;
      return {
        label: `abd=${abd} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 125,
      };
    }),
  },
];

export const REAR_DELT_FLY_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "RDF-DEPTH-OK",
    exerciseId: "rear-delt-fly",
    ruleId: "fly-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildDbFlyPose({ wristIncludedDeg: 70 }),
    description: "打开够开",
    expectTriggered: false,
  },
  {
    id: "RDF-DEPTH-CRIT-OK",
    exerciseId: "rear-delt-fly",
    ruleId: "fly-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildDbFlyNearDriveMeasured(134.5),
    description: "drive≈134.5°",
    expectTriggered: false,
  },
  {
    id: "RDF-DEPTH-CRIT-FAULT",
    exerciseId: "rear-delt-fly",
    ruleId: "fly-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildDbFlyNearDriveMeasured(135.5),
    description: "drive≈135.5°",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "RDF-DEPTH-VIOLATION",
    exerciseId: "rear-delt-fly",
    ruleId: "fly-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildDbFlyPose({ wristIncludedDeg: 25 }),
    description: "明显没打开",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "RDF-DEPTH-PHASE-OFF",
    exerciseId: "rear-delt-fly",
    ruleId: "fly-depth",
    kind: "phase_off",
    phase: "stand",
    pose: buildDbFlyPose({ wristIncludedDeg: 25 }),
    description: "合拢相位不评估打开",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const REAR_DELT_FLY_SWEEPS: SweepSpec[] = [
  {
    id: "RDF-SWEEP-DEPTH",
    exerciseId: "rear-delt-fly",
    ruleId: "fly-depth",
    phase: "bottom",
    description: "drive ≥135 触发 fly-depth",
    samples: Array.from({ length: 21 }, (_, i) => {
      const included = 20 + i * 4;
      const pose = buildDbFlyPose({ wristIncludedDeg: included });
      const measured = dbFlyDriveDeg(pose) ?? 180 - included;
      return {
        label: `inc=${included} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 135,
      };
    }),
  },
];

export const FACE_PULL_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "FP-HEIGHT-OK",
    exerciseId: "face-pull",
    ruleId: "pull-height",
    kind: "ok",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 90 }),
    description: "拉至面部",
    expectTriggered: false,
  },
  {
    id: "FP-HEIGHT-CRIT-OK",
    exerciseId: "face-pull",
    ruleId: "pull-height",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(114.5),
    description: "肘≈114.5°",
    expectTriggered: false,
  },
  {
    id: "FP-HEIGHT-CRIT-FAULT",
    exerciseId: "face-pull",
    ruleId: "pull-height",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(115.5),
    description: "肘≈115.5°",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "FP-HEIGHT-VIOLATION",
    exerciseId: "face-pull",
    ruleId: "pull-height",
    kind: "violation",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 140 }),
    description: "明显没拉到面部",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "FP-HEIGHT-PHASE-OFF",
    exerciseId: "face-pull",
    ruleId: "pull-height",
    kind: "phase_off",
    phase: "stand",
    pose: buildPushupPose({ elbowDeg: 140 }),
    description: "伸臂相位不评估拉近",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
];

export const FACE_PULL_SWEEPS: SweepSpec[] = [
  {
    id: "FP-SWEEP-HEIGHT",
    exerciseId: "face-pull",
    ruleId: "pull-height",
    phase: "bottom",
    description: "肘 ≥115 触发 pull-height",
    samples: Array.from({ length: 21 }, (_, i) => {
      const elbowIn = 100 + i;
      const pose = buildPushupPose({ elbowDeg: elbowIn });
      const measured = meanVisibleElbowAngle(pose) ?? elbowIn;
      return {
        label: `in=${elbowIn} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 115,
      };
    }),
  },
];

export const PIKE_PUSHUP_BOUNDARY_CASES: BoundaryCase[] = [
  {
    id: "PPU-ELBOW-OK",
    exerciseId: "pike-pushup",
    ruleId: "elbow-depth",
    kind: "ok",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 100, hipDrop: 0.32 }),
    description: "头够近地面",
    expectTriggered: false,
  },
  {
    id: "PPU-ELBOW-CRIT-OK",
    exerciseId: "pike-pushup",
    ruleId: "elbow-depth",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(119.2, { hipDrop: 0.32 }),
    description: "肘≈119.2°",
    expectTriggered: false,
  },
  {
    id: "PPU-ELBOW-CRIT-FAULT",
    exerciseId: "pike-pushup",
    ruleId: "elbow-depth",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildPushupNearElbowMeasured(120.8, { hipDrop: 0.32 }),
    description: "肘≈120.8°",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "PPU-ELBOW-VIOLATION",
    exerciseId: "pike-pushup",
    ruleId: "elbow-depth",
    kind: "violation",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 145, hipDrop: 0.32 }),
    description: "明显没降够",
    expectTriggered: true,
    expectStatus: "warning",
  },
  {
    id: "PPU-ELBOW-FRONTISH-OFF",
    exerciseId: "pike-pushup",
    ruleId: "elbow-depth",
    kind: "ok",
    phase: "bottom",
    pose: frontishPushupPose({ elbowDeg: 145, hipDrop: 0.22 }),
    description: "偏正关掉 elbow-depth",
    expectTriggered: false,
  },
  {
    id: "PPU-ELBOW-PHASE-OFF",
    exerciseId: "pike-pushup",
    ruleId: "elbow-depth",
    kind: "phase_off",
    phase: "stand",
    pose: buildPushupPose({ elbowDeg: 145, hipDrop: 0.22 }),
    description: "撑起相位不评估深度",
    expectTriggered: false,
    expectRuleAbsent: true,
  },
  {
    id: "PPU-PIKE-OK",
    exerciseId: "pike-pushup",
    ruleId: "pike-line",
    kind: "ok",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 100, hipDrop: 0.28 }),
    description: "倒 V 髋高",
    expectTriggered: false,
  },
  {
    id: "PPU-PIKE-CRIT-OK",
    exerciseId: "pike-pushup",
    ruleId: "pike-line",
    kind: "critical_ok",
    phase: "bottom",
    pose: buildPushupNearBodyLineMeasured(99.5, { elbowDeg: 120 }),
    description: "一线≈99.5°",
    expectTriggered: false,
  },
  {
    id: "PPU-PIKE-CRIT-FAULT",
    exerciseId: "pike-pushup",
    ruleId: "pike-line",
    kind: "critical_fault",
    phase: "bottom",
    pose: buildPushupNearBodyLineMeasured(100.8, { elbowDeg: 120 }),
    description: "一线≈100.8°",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "PPU-PIKE-VIOLATION",
    exerciseId: "pike-pushup",
    ruleId: "pike-line",
    kind: "violation",
    phase: "bottom",
    pose: buildPushupPose({ elbowDeg: 165, hipDrop: 0 }),
    description: "摊成普通俯卧撑",
    expectTriggered: true,
    expectStatus: "error",
  },
  {
    id: "PPU-PIKE-FRONTISH-OFF",
    exerciseId: "pike-pushup",
    ruleId: "pike-line",
    kind: "ok",
    phase: "bottom",
    pose: frontishPushupPose({ elbowDeg: 165, hipDrop: 0 }),
    description: "偏正关掉 pike-line",
    expectTriggered: false,
  },
];

export const PIKE_PUSHUP_SWEEPS: SweepSpec[] = [
  {
    id: "PPU-SWEEP-ELBOW",
    exerciseId: "pike-pushup",
    ruleId: "elbow-depth",
    phase: "bottom",
    description: "肘 ≥120 触发 elbow-depth",
    samples: Array.from({ length: 21 }, (_, i) => {
      const elbowIn = 110 + i;
      const pose = buildPushupPose({ elbowDeg: elbowIn, hipDrop: 0.22 });
      const measured = meanVisibleElbowAngle(pose) ?? elbowIn;
      return {
        label: `in=${elbowIn} meas=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured >= 120,
      };
    }),
  },
  {
    id: "PPU-SWEEP-PIKE",
    exerciseId: "pike-pushup",
    ruleId: "pike-line",
    phase: "bottom",
    description: "肩髋踝 >100 触发 pike-line",
    samples: Array.from({ length: 13 }, (_, i) => {
      const target = 88 + i * 2;
      const pose = buildPushupNearBodyLineMeasured(target, { elbowDeg: 120 });
      const measured = pushupBodyLineDeg(pose) ?? target;
      return {
        label: `line=${measured.toFixed(1)}`,
        pose,
        phase: "bottom" as const,
        valueDeg: measured,
        expectTriggered: measured > 100,
      };
    }),
  },
];
