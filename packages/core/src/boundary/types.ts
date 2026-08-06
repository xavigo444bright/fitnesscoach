/**
 * 动作规则边界矩阵类型（RULE-BOUNDARY / VT-RB-001）。
 * 手册：docs/RULE-BOUNDARY.md
 */

import type { Phase, Pose, ValidationStatus } from "../types.js";

/** 边界用例语义，见 docs/RULE-BOUNDARY.md §3。 */
export type BoundaryKind =
  | "ok"
  | "critical_ok"
  | "critical_fault"
  | "violation"
  | "phase_off"
  | "disabled";

export interface BoundaryCase {
  /** 稳定 ID，如 SQ-DEPTH-CRIT-OK */
  id: string;
  exerciseId: string;
  /** 本用例盯住的规则；phase_off/disabled 也填目标规则 */
  ruleId: string;
  kind: BoundaryKind;
  phase: Phase;
  pose: Pose;
  description: string;
  /**
   * 期望该 ruleId 是否触发。
   * phase_off：期望规则不在 results 中（未评估）。
   */
  expectTriggered: boolean;
  /** phase_off 时为 true：断言 results 中无此 ruleId */
  expectRuleAbsent?: boolean;
  /** 可选：整帧 status */
  expectStatus?: ValidationStatus;
}

export interface SweepSample {
  label: string;
  pose: Pose;
  phase: Phase;
  /** 扫到的自变量（度） */
  valueDeg: number;
  expectTriggered: boolean;
}

export interface SweepSpec {
  id: string;
  exerciseId: string;
  ruleId: string;
  phase: Phase;
  description: string;
  samples: SweepSample[];
}
