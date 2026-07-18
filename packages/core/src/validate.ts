/**
 * @fitness-coach/core — 动作校验（M1-T4，VT-P1-003）
 *
 * 平台无关：吃 Pose + 当前相位，产出 ValidationResult。
 * 深蹲规则暂内联于此（评估器 + 阈值），M1-T7 抽到 exercises/squat.ts。
 * 真源：docs/exercises/squat-rules.md。
 */

import { jointAngle } from "./angles.js";
import {
  LandmarkIndex,
  type Phase,
  type Pose,
  type RuleDefinition,
  type RuleResult,
  type ValidationResult,
  type ValidationStatus,
} from "./types.js";

/** 可评估规则：静态定义 + 单帧判定函数。 */
export interface EvaluableRule extends RuleDefinition {
  evaluate(pose: Pose): { triggered: boolean; measuredDeg?: number };
}

/** 该规则是否在当前相位生效（phases 为空表示所有相位）。 */
function ruleAppliesToPhase(rule: RuleDefinition, phase: Phase): boolean {
  return rule.phases.length === 0 || rule.phases.includes(phase);
}

/**
 * 汇总状态：任一 error → error；否则任一 warning → warning；否则 correct。
 */
function summarize(results: RuleResult[]): ValidationStatus {
  let hasWarning = false;
  for (const r of results) {
    if (!r.triggered) continue;
    if (r.severity === "error") return "error";
    if (r.severity === "warning") hasWarning = true;
  }
  return hasWarning ? "warning" : "correct";
}

/** 用一侧的髋-膝-踝求膝角。 */
function kneeAngle(pose: Pose, side: "left" | "right"): number | null {
  const idx =
    side === "left"
      ? {
          a: LandmarkIndex.LeftHip,
          b: LandmarkIndex.LeftKnee,
          c: LandmarkIndex.LeftAnkle,
        }
      : {
          a: LandmarkIndex.RightHip,
          b: LandmarkIndex.RightKnee,
          c: LandmarkIndex.RightAnkle,
        };
  return jointAngle(pose, idx);
}

/** 躯干角：肩-髋-膝（右侧），160–180 视为直立。 */
function torsoAngle(pose: Pose): number | null {
  return jointAngle(pose, {
    a: LandmarkIndex.RightShoulder,
    b: LandmarkIndex.RightHip,
    c: LandmarkIndex.RightKnee,
  });
}

/**
 * 冠状面 valgus 近似：膝相对「踝的竖直线」的水平偏移，用小腿竖直长度换算成角度。
 * 只对膝向内/外的横向位移敏感，不把矢状面「膝前移」误判为内扣。
 * 正面机位下髋与踝的 x 近似相等，此度量与髋-踝线一致。
 */
function valgusDeg(pose: Pose, side: "left" | "right"): number | null {
  const knee =
    pose[side === "left" ? LandmarkIndex.LeftKnee : LandmarkIndex.RightKnee];
  const ankle =
    pose[side === "left" ? LandmarkIndex.LeftAnkle : LandmarkIndex.RightAnkle];
  if (!knee || !ankle) return null;
  const dev = Math.abs(knee.x - ankle.x);
  const shin = Math.abs(ankle.y - knee.y) || 0.2;
  return (Math.atan2(dev, shin) * 180) / Math.PI;
}

/** 深蹲规则集合（与 squat-rules.md 一一对应）。 */
export const SQUAT_RULES: EvaluableRule[] = [
  {
    id: "squat-depth",
    joints: {
      a: LandmarkIndex.RightHip,
      b: LandmarkIndex.RightKnee,
      c: LandmarkIndex.RightAnkle,
    },
    severity: "error",
    phases: ["bottom"],
    toleranceDeg: 10,
    message: "蹲得不够深，臀部再下沉一些",
    evaluate(pose) {
      const deg = kneeAngle(pose, "right");
      if (deg == null) return { triggered: false };
      // 膝角 < 90 视为达标；否则（未够深）触发
      return { triggered: deg >= 90, measuredDeg: deg };
    },
  },
  {
    id: "knee-valgus-l",
    joints: {
      a: LandmarkIndex.LeftHip,
      b: LandmarkIndex.LeftKnee,
      c: LandmarkIndex.LeftAnkle,
    },
    severity: "error",
    phases: ["descend", "bottom", "ascend"],
    toleranceDeg: 15,
    message: "左膝内扣，向外推开膝盖",
    evaluate(pose) {
      const deg = valgusDeg(pose, "left");
      if (deg == null) return { triggered: false };
      return { triggered: deg > 15, measuredDeg: deg };
    },
  },
  {
    id: "knee-valgus-r",
    joints: {
      a: LandmarkIndex.RightHip,
      b: LandmarkIndex.RightKnee,
      c: LandmarkIndex.RightAnkle,
    },
    severity: "error",
    phases: ["descend", "bottom", "ascend"],
    toleranceDeg: 15,
    message: "右膝内扣，向外推开膝盖",
    evaluate(pose) {
      const deg = valgusDeg(pose, "right");
      if (deg == null) return { triggered: false };
      return { triggered: deg > 15, measuredDeg: deg };
    },
  },
  {
    id: "torso-upright",
    joints: {
      a: LandmarkIndex.RightShoulder,
      b: LandmarkIndex.RightHip,
      c: LandmarkIndex.RightKnee,
    },
    severity: "warning",
    phases: [],
    toleranceDeg: 15,
    message: "躯干前倾过多，挺胸收紧核心",
    evaluate(pose) {
      const deg = torsoAngle(pose);
      if (deg == null) return { triggered: false };
      // 160–180 直立，容差 15 → < 145 触发
      return { triggered: deg < 145, measuredDeg: deg };
    },
  },
];

/**
 * 对单帧姿态在给定相位下跑一组规则。
 */
export function validate(
  pose: Pose,
  phase: Phase,
  rules: EvaluableRule[] = SQUAT_RULES,
): ValidationResult {
  const results: RuleResult[] = [];
  for (const rule of rules) {
    if (!ruleAppliesToPhase(rule, phase)) continue;
    const { triggered, measuredDeg } = rule.evaluate(pose);
    results.push({
      id: rule.id,
      triggered,
      severity: rule.severity,
      message: rule.message,
      measuredDeg,
    });
  }
  const status = summarize(results);
  const messages = results.filter((r) => r.triggered).map((r) => r.message);
  return { status, messages, results };
}
