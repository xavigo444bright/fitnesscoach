/**
 * 跑单条 BoundaryCase / SweepSample，供矩阵与扫描测试共用。
 */

import { validate, type EvaluableRule } from "../validate.js";
import type { BoundaryCase, SweepSample } from "./types.js";

export interface BoundaryRunResult {
  ok: boolean;
  triggered: boolean | null;
  present: boolean;
  status: string;
  detail: string;
}

export function runBoundaryCase(
  c: BoundaryCase,
  rules?: EvaluableRule[],
): BoundaryRunResult {
  const res = validate(c.pose, c.phase, rules);
  const row = res.results.find((r) => r.id === c.ruleId);
  const present = row != null;
  const triggered = row ? row.triggered : null;

  if (c.expectRuleAbsent) {
    if (present) {
      return {
        ok: false,
        triggered,
        present,
        status: res.status,
        detail: `${c.id}: 期望规则 ${c.ruleId} 不评估，但仍在 results`,
      };
    }
    if (c.expectStatus != null && res.status !== c.expectStatus) {
      return {
        ok: false,
        triggered,
        present,
        status: res.status,
        detail: `${c.id}: status 期望 ${c.expectStatus} 实际 ${res.status}`,
      };
    }
    return { ok: true, triggered, present, status: res.status, detail: "ok" };
  }

  if (!present) {
    return {
      ok: false,
      triggered,
      present,
      status: res.status,
      detail: `${c.id}: 规则 ${c.ruleId} 未出现在 results`,
    };
  }
  if (triggered !== c.expectTriggered) {
    return {
      ok: false,
      triggered,
      present,
      status: res.status,
      detail: `${c.id}: ${c.ruleId} triggered 期望 ${c.expectTriggered} 实际 ${triggered}`,
    };
  }
  if (c.expectStatus != null && res.status !== c.expectStatus) {
    return {
      ok: false,
      triggered,
      present,
      status: res.status,
      detail: `${c.id}: status 期望 ${c.expectStatus} 实际 ${res.status}`,
    };
  }
  return { ok: true, triggered, present, status: res.status, detail: "ok" };
}

export function runSweepSample(
  ruleId: string,
  sample: SweepSample,
  rules?: EvaluableRule[],
): BoundaryRunResult {
  const res = validate(sample.pose, sample.phase, rules);
  const row = res.results.find((r) => r.id === ruleId);
  const present = row != null;
  const triggered = row ? row.triggered : false;
  if (!present) {
    return {
      ok: false,
      triggered: null,
      present,
      status: res.status,
      detail: `${sample.label}: 规则 ${ruleId} 未评估`,
    };
  }
  if (triggered !== sample.expectTriggered) {
    return {
      ok: false,
      triggered,
      present,
      status: res.status,
      detail: `${sample.label}: value=${sample.valueDeg} triggered 期望 ${sample.expectTriggered} 实际 ${triggered}`,
    };
  }
  return { ok: true, triggered, present, status: res.status, detail: "ok" };
}
