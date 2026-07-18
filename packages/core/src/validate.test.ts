import { describe, expect, it } from "vitest";
import { FIXTURES } from "./fixtures/index.js";
import { SQUAT_RULES, validate } from "./validate.js";
import type { Phase } from "./types.js";

/** 单帧夹具在测试中显式给相位（相位状态机是 M1-T5）。 */
const PHASE_OF: Record<string, Phase> = {
  "FX-SQUAT-STAND": "stand",
  "FX-SQUAT-BOTTOM-OK": "bottom",
  "FX-SQUAT-SHALLOW": "bottom",
  "FX-SQUAT-VALGUS-L": "bottom",
  "FX-SQUAT-LEAN": "descend",
};

describe("VT-P1-003 validate 与夹具 expectedStatus 一致", () => {
  for (const id of Object.keys(PHASE_OF)) {
    it(`${id} → ${FIXTURES[id].expectedStatus}`, () => {
      const fx = FIXTURES[id];
      const res = validate(fx.pose!, PHASE_OF[id]);
      expect(res.status).toBe(fx.expectedStatus);
    });
  }
});

describe("validate 触发的规则与 expectedRuleIds 一致", () => {
  for (const id of Object.keys(PHASE_OF)) {
    it(id, () => {
      const fx = FIXTURES[id];
      const res = validate(fx.pose!, PHASE_OF[id]);
      const triggered = res.results
        .filter((r) => r.triggered)
        .map((r) => r.id)
        .sort();
      expect(triggered).toEqual([...(fx.expectedRuleIds ?? [])].sort());
    });
  }
});

describe("相位过滤", () => {
  it("stand 相位不评估 squat-depth / valgus", () => {
    const res = validate(FIXTURES["FX-SQUAT-SHALLOW"].pose!, "stand");
    const ids = res.results.map((r) => r.id);
    expect(ids).not.toContain("squat-depth");
    expect(ids).not.toContain("knee-valgus-l");
    // torso-upright 是 all 相位，应仍在
    expect(ids).toContain("torso-upright");
  });

  it("SHALLOW 在 bottom 触发 squat-depth，在 descend 不触发（规则不生效）", () => {
    const bottom = validate(FIXTURES["FX-SQUAT-SHALLOW"].pose!, "bottom");
    expect(bottom.status).toBe("error");
    const descend = validate(FIXTURES["FX-SQUAT-SHALLOW"].pose!, "descend");
    expect(descend.results.map((r) => r.id)).not.toContain("squat-depth");
  });
});

describe("汇总优先级", () => {
  it("error 压过 warning", () => {
    // VALGUS-L 底部：valgus(error) 存在；即使 torso 正常也应为 error
    const res = validate(FIXTURES["FX-SQUAT-VALGUS-L"].pose!, "bottom");
    expect(res.status).toBe("error");
  });

  it("规则集合覆盖 squat-rules.md 四条", () => {
    const ids = SQUAT_RULES.map((r) => r.id).sort();
    expect(ids).toEqual(
      ["knee-valgus-l", "knee-valgus-r", "squat-depth", "torso-upright"].sort(),
    );
  });
});
