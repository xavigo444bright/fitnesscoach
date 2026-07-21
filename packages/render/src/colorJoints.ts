/**
 * 按 validate 结果给关节/骨上色（M3-T2 / VT-P3A-002 / FR-061）
 */

import {
  SQUAT_RULES,
  type EvaluableRule,
  type ValidationResult,
  type ValidationStatus,
} from "@fitness-coach/core";
import type { RenderBone, RenderJoint, SkeletonScene } from "./types.js";

const RANK: Record<ValidationStatus, number> = {
  correct: 0,
  warning: 1,
  error: 2,
};

function worse(a: ValidationStatus, b: ValidationStatus): ValidationStatus {
  return RANK[a] >= RANK[b] ? a : b;
}

function paintJoint(
  map: Map<number, ValidationStatus>,
  index: number,
  status: ValidationStatus,
): void {
  const prev = map.get(index) ?? "correct";
  map.set(index, worse(prev, status));
}

/**
 * 返回新 scene：触发规则涉及的关节/连线染成 warning|error，其余 correct。
 */
export function applyJointColors(
  scene: SkeletonScene,
  validation: ValidationResult,
  rules: EvaluableRule[] = SQUAT_RULES,
): SkeletonScene {
  const byId = new Map(rules.map((r) => [r.id, r]));
  const jointStatus = new Map<number, ValidationStatus>();

  for (const r of validation.results) {
    if (!r.triggered) continue;
    const status: ValidationStatus =
      r.severity === "error" ? "error" : "warning";
    const rule = byId.get(r.id);
    if (!rule) continue;
    paintJoint(jointStatus, rule.joints.a, status);
    paintJoint(jointStatus, rule.joints.b, status);
    paintJoint(jointStatus, rule.joints.c, status);
  }

  const joints: RenderJoint[] = scene.joints.map((j) => ({
    ...j,
    status: jointStatus.get(j.index) ?? "correct",
  }));

  const statusOf = (index: number): ValidationStatus =>
    jointStatus.get(index) ?? "correct";

  const bones: RenderBone[] = scene.bones.map((b) => ({
    ...b,
    // 两端任一有问题则骨随更严重一端
    status: worse(statusOf(b.from), statusOf(b.to)),
  }));

  return { ...scene, joints, bones };
}
