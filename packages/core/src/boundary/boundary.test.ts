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
import { GLUTE_BRIDGE_RULES, LUNGE_RULES, PUSHUP_RULES, PLANK_RULES, DB_ROW_RULES, OHP_RULES, BENCH_PRESS_RULES, RDL_RULES, PULLUP_RULES, DB_FLY_RULES, DIP_RULES, INCLINE_PUSHUP_RULES, CABLE_CROSSOVER_RULES, CHEST_PRESS_MACHINE_RULES, LATERAL_RAISE_RULES, FRONT_RAISE_RULES, REAR_DELT_FLY_RULES, FACE_PULL_RULES, PIKE_PUSHUP_RULES } from "../validate.js";
import { runBoundaryCase, runSweepSample } from "./runCase.js";
import {
  GLUTE_BRIDGE_BOUNDARY_CASES,
  GLUTE_BRIDGE_SWEEPS,
} from "./gluteBridgeMatrix.js";
import { LUNGE_BOUNDARY_CASES, LUNGE_SWEEPS } from "./lungeMatrix.js";
import { PUSHUP_BOUNDARY_CASES, PUSHUP_SWEEPS } from "./pushupMatrix.js";
import { SQUAT_BOUNDARY_CASES, SQUAT_SWEEPS } from "./squatMatrix.js";
import {
  PLANK_BOUNDARY_CASES,
  PLANK_SWEEPS,
  DB_ROW_BOUNDARY_CASES,
  DB_ROW_SWEEPS,
  OHP_BOUNDARY_CASES,
  OHP_SWEEPS,
  BENCH_PRESS_BOUNDARY_CASES,
  BENCH_PRESS_SWEEPS,
  RDL_BOUNDARY_CASES,
  RDL_SWEEPS,
  PULLUP_BOUNDARY_CASES,
  PULLUP_SWEEPS,
  DB_FLY_BOUNDARY_CASES,
  DB_FLY_SWEEPS,
  DIP_BOUNDARY_CASES,
  DIP_SWEEPS,
  INCLINE_PUSHUP_BOUNDARY_CASES,
  INCLINE_PUSHUP_SWEEPS,
  CABLE_CROSSOVER_BOUNDARY_CASES,
  CABLE_CROSSOVER_SWEEPS,
  CHEST_PRESS_MACHINE_BOUNDARY_CASES,
  CHEST_PRESS_MACHINE_SWEEPS,
  LATERAL_RAISE_BOUNDARY_CASES,
  LATERAL_RAISE_SWEEPS,
  FRONT_RAISE_BOUNDARY_CASES,
  FRONT_RAISE_SWEEPS,
  REAR_DELT_FLY_BOUNDARY_CASES,
  REAR_DELT_FLY_SWEEPS,
  FACE_PULL_BOUNDARY_CASES,
  FACE_PULL_SWEEPS,
  PIKE_PUSHUP_BOUNDARY_CASES,
  PIKE_PUSHUP_SWEEPS,
} from "./batchMatrix.js";

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

describe("VT-RB-001 臀桥边界矩阵", () => {
  for (const c of GLUTE_BRIDGE_BOUNDARY_CASES) {
    it(`${c.id} [${c.kind}] ${c.description}`, () => {
      const out = runBoundaryCase(c, GLUTE_BRIDGE_RULES);
      expect(out.ok, out.detail).toBe(true);
    });
  }

  it("矩阵覆盖 hip-extension 的 ok/critical_*/violation/phase_off", () => {
    const kinds = new Set(GLUTE_BRIDGE_BOUNDARY_CASES.map((c) => c.kind));
    for (const k of [
      "ok",
      "critical_ok",
      "critical_fault",
      "violation",
      "phase_off",
    ] as const) {
      expect(kinds.has(k), `缺 kind=${k}`).toBe(true);
    }
  });
});

describe("VT-RB-002 臀桥阈值扫描", () => {
  for (const sweep of GLUTE_BRIDGE_SWEEPS) {
    describe(sweep.id, () => {
      it(sweep.description, () => {
        const fails: string[] = [];
        for (const sample of sweep.samples) {
          const out = runSweepSample(sweep.ruleId, sample, GLUTE_BRIDGE_RULES);
          if (!out.ok) fails.push(out.detail);
        }
        expect(fails, fails.join("\n")).toEqual([]);
      });
    });
  }
});

describe("VT-RB-001 弓步边界矩阵", () => {
  for (const c of LUNGE_BOUNDARY_CASES) {
    it(`${c.id} [${c.kind}] ${c.description}`, () => {
      const out = runBoundaryCase(c, LUNGE_RULES);
      expect(out.ok, out.detail).toBe(true);
    });
  }

  it("矩阵覆盖 lunge-depth / torso 的 ok/critical_*/violation/phase_off", () => {
    const rules = new Set(LUNGE_BOUNDARY_CASES.map((c) => c.ruleId));
    expect(rules.has("lunge-depth")).toBe(true);
    expect(rules.has("torso-upright")).toBe(true);
    const kinds = new Set(LUNGE_BOUNDARY_CASES.map((c) => c.kind));
    for (const k of [
      "ok",
      "critical_ok",
      "critical_fault",
      "violation",
      "phase_off",
    ] as const) {
      expect(kinds.has(k), `缺 kind=${k}`).toBe(true);
    }
  });
});

describe("VT-RB-002 弓步阈值扫描", () => {
  for (const sweep of LUNGE_SWEEPS) {
    describe(sweep.id, () => {
      it(sweep.description, () => {
        const fails: string[] = [];
        for (const sample of sweep.samples) {
          const out = runSweepSample(sweep.ruleId, sample, LUNGE_RULES);
          if (!out.ok) fails.push(out.detail);
        }
        expect(fails, fails.join("\n")).toEqual([]);
      });
    });
  }
});

function matrixSuite(
  title: string,
  cases: typeof PLANK_BOUNDARY_CASES,
  rules: typeof PLANK_RULES,
  sweeps: typeof PLANK_SWEEPS,
) {
  describe(`VT-RB-001 ${title}边界矩阵`, () => {
    for (const c of cases) {
      it(`${c.id} [${c.kind}] ${c.description}`, () => {
        const out = runBoundaryCase(c, rules);
        expect(out.ok, out.detail).toBe(true);
      });
    }
  });
  describe(`VT-RB-002 ${title}阈值扫描`, () => {
    for (const sweep of sweeps) {
      describe(sweep.id, () => {
        it(sweep.description, () => {
          const fails: string[] = [];
          for (const sample of sweep.samples) {
            const out = runSweepSample(sweep.ruleId, sample, rules);
            if (!out.ok) fails.push(out.detail);
          }
          expect(fails, fails.join("\n")).toEqual([]);
        });
      });
    }
  });
}

matrixSuite("平板", PLANK_BOUNDARY_CASES, PLANK_RULES, PLANK_SWEEPS);
matrixSuite("划船", DB_ROW_BOUNDARY_CASES, DB_ROW_RULES, DB_ROW_SWEEPS);
matrixSuite("推举", OHP_BOUNDARY_CASES, OHP_RULES, OHP_SWEEPS);
matrixSuite("卧推", BENCH_PRESS_BOUNDARY_CASES, BENCH_PRESS_RULES, BENCH_PRESS_SWEEPS);
matrixSuite("罗马尼亚硬拉", RDL_BOUNDARY_CASES, RDL_RULES, RDL_SWEEPS);
matrixSuite("引体", PULLUP_BOUNDARY_CASES, PULLUP_RULES, PULLUP_SWEEPS);
matrixSuite("飞鸟", DB_FLY_BOUNDARY_CASES, DB_FLY_RULES, DB_FLY_SWEEPS);
matrixSuite("双杠", DIP_BOUNDARY_CASES, DIP_RULES, DIP_SWEEPS);
matrixSuite("上斜俯卧撑", INCLINE_PUSHUP_BOUNDARY_CASES, INCLINE_PUSHUP_RULES, INCLINE_PUSHUP_SWEEPS);
matrixSuite("绳索夹胸", CABLE_CROSSOVER_BOUNDARY_CASES, CABLE_CROSSOVER_RULES, CABLE_CROSSOVER_SWEEPS);
matrixSuite("坐姿推胸器", CHEST_PRESS_MACHINE_BOUNDARY_CASES, CHEST_PRESS_MACHINE_RULES, CHEST_PRESS_MACHINE_SWEEPS);
matrixSuite("侧平举", LATERAL_RAISE_BOUNDARY_CASES, LATERAL_RAISE_RULES, LATERAL_RAISE_SWEEPS);
matrixSuite("前平举", FRONT_RAISE_BOUNDARY_CASES, FRONT_RAISE_RULES, FRONT_RAISE_SWEEPS);
matrixSuite("俯身飞鸟", REAR_DELT_FLY_BOUNDARY_CASES, REAR_DELT_FLY_RULES, REAR_DELT_FLY_SWEEPS);
matrixSuite("面拉", FACE_PULL_BOUNDARY_CASES, FACE_PULL_RULES, FACE_PULL_SWEEPS);
matrixSuite("派克俯卧撑", PIKE_PUSHUP_BOUNDARY_CASES, PIKE_PUSHUP_RULES, PIKE_PUSHUP_SWEEPS);

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
