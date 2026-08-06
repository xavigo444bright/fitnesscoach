/**
 * RULE-BOUNDARY 自动化检验（VT-RB-001～003）。
 * 手册：docs/RULE-BOUNDARY.md
 */

import { describe, expect, it } from "vitest";
import {
  initialFeedbackState,
  listConfirmedFeedback,
  pushFeedback,
} from "../feedback.js";
import type { ValidationResult } from "../types.js";
import { PUSHUP_RULES } from "../validate.js";
import { runBoundaryCase, runSweepSample } from "./runCase.js";
import { PUSHUP_BOUNDARY_CASES, PUSHUP_SWEEPS } from "./pushupMatrix.js";
import { SQUAT_BOUNDARY_CASES, SQUAT_SWEEPS } from "./squatMatrix.js";

describe("VT-RB-001 深蹲边界矩阵", () => {
  for (const c of SQUAT_BOUNDARY_CASES) {
    it(`${c.id} [${c.kind}] ${c.description}`, () => {
      const out = runBoundaryCase(c);
      expect(out.ok, out.detail).toBe(true);
    });
  }

  it("矩阵覆盖 depth/torso/valgus 与全部 kind", () => {
    const rules = new Set(SQUAT_BOUNDARY_CASES.map((c) => c.ruleId));
    expect(rules.has("squat-depth")).toBe(true);
    expect(rules.has("torso-upright")).toBe(true);
    expect(rules.has("knee-valgus-l")).toBe(true);
    const kinds = new Set(SQUAT_BOUNDARY_CASES.map((c) => c.kind));
    for (const k of [
      "ok",
      "critical_ok",
      "critical_fault",
      "violation",
      "phase_off",
      "disabled",
    ] as const) {
      expect(kinds.has(k), `缺 kind=${k}`).toBe(true);
    }
  });
});

describe("VT-RB-002 深蹲阈值扫描", () => {
  for (const sweep of SQUAT_SWEEPS) {
    describe(sweep.id, () => {
      it(sweep.description, () => {
        const fails: string[] = [];
        for (const sample of sweep.samples) {
          const out = runSweepSample(sweep.ruleId, sample);
          if (!out.ok) fails.push(out.detail);
        }
        expect(fails, fails.join("\n")).toEqual([]);
      });
    });
  }
});

describe("VT-RB-001 俯卧撑边界矩阵", () => {
  for (const c of PUSHUP_BOUNDARY_CASES) {
    it(`${c.id} [${c.kind}] ${c.description}`, () => {
      const out = runBoundaryCase(c, PUSHUP_RULES);
      expect(out.ok, out.detail).toBe(true);
    });
  }
});

describe("VT-RB-002 俯卧撑阈值扫描", () => {
  for (const sweep of PUSHUP_SWEEPS) {
    describe(sweep.id, () => {
      it(sweep.description, () => {
        const fails: string[] = [];
        for (const sample of sweep.samples) {
          const out = runSweepSample(sweep.ruleId, sample, PUSHUP_RULES);
          if (!out.ok) fails.push(out.detail);
        }
        expect(fails, fails.join("\n")).toEqual([]);
      });
    });
  }
});

describe("VT-RB-003 反馈 latch 回归（扩动作复用）", () => {
  const D = 800;
  const hit = (id: string): ValidationResult => ({
    status: "warning",
    messages: ["x"],
    results: [
      { id, triggered: true, severity: "warning", message: "x" },
    ],
  });
  const offSamePhase = (id: string): ValidationResult => ({
    status: "correct",
    messages: [],
    results: [
      { id, triggered: false, severity: "warning", message: "x" },
    ],
  });
  const emptyPhase: ValidationResult = {
    status: "correct",
    messages: [],
    results: [],
  };

  it("进入防抖：持续 debounceMs 才确认", () => {
    const s = initialFeedbackState();
    const h = hit("torso-upright");
    pushFeedback(s, h, 0);
    expect(listConfirmedFeedback(s, h, D - 1)).toHaveLength(0);
    pushFeedback(s, h, D);
    expect(listConfirmedFeedback(s, h, D)).toHaveLength(1);
  });

  it("解除防抖：已确认后须再持续 debounceMs 未触发才松开", () => {
    const s = initialFeedbackState();
    const h = hit("torso-upright");
    const o = offSamePhase("torso-upright");
    pushFeedback(s, h, 0);
    pushFeedback(s, h, D);
    pushFeedback(s, o, D + 50);
    expect(listConfirmedFeedback(s, o, D + 50)).toHaveLength(1);
    pushFeedback(s, o, D + 50 + D);
    expect(listConfirmedFeedback(s, o, D + 50 + D)).toHaveLength(0);
  });

  it("相位切换：规则不再评估时立刻清 latch", () => {
    const s = initialFeedbackState();
    const h = hit("torso-upright");
    pushFeedback(s, h, 0);
    pushFeedback(s, h, D);
    pushFeedback(s, emptyPhase, D + 10);
    expect(listConfirmedFeedback(s, emptyPhase, D + 10)).toHaveLength(0);
  });
});
