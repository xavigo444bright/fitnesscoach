import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEEDBACK_CONFIG,
  initialFeedbackState,
  listConfirmedFeedback,
  pushFeedback,
} from "./feedback.js";
import type { ValidationResult } from "./types.js";

/** 造一个「触发了某规则」的 validate 结果。 */
const withRule = (id: string, triggered: boolean): ValidationResult => ({
  status: triggered ? "error" : "correct",
  messages: triggered ? ["x"] : [],
  results: [
    { id, triggered, severity: "error", message: "x" },
  ],
});

const EMPTY: ValidationResult = { status: "correct", messages: [], results: [] };

const D = DEFAULT_FEEDBACK_CONFIG.debounceMs;

describe("VT-P1-007 防抖：单帧不触发，持续 debounce 才触发", () => {
  it("单帧错误不播报", () => {
    const s = initialFeedbackState();
    const cues = pushFeedback(s, withRule("squat-depth", true), 0);
    expect(cues).toHaveLength(0);
  });

  it("持续未满 debounce 不播报，满后播报", () => {
    const s = initialFeedbackState();
    pushFeedback(s, withRule("squat-depth", true), 0);
    expect(pushFeedback(s, withRule("squat-depth", true), D - 100)).toHaveLength(0);
    expect(pushFeedback(s, withRule("squat-depth", true), D)).toHaveLength(1);
  });

  it("中途中断则重新计时", () => {
    const s = initialFeedbackState();
    pushFeedback(s, withRule("squat-depth", true), 0);
    pushFeedback(s, withRule("squat-depth", true), D - 100);
    pushFeedback(s, EMPTY, D - 50);
    expect(pushFeedback(s, withRule("squat-depth", true), D)).toHaveLength(0);
    expect(pushFeedback(s, withRule("squat-depth", true), D + D)).toHaveLength(1);
  });
});

describe("VT-P1-008 冷却：cooldown 内同错误不重复", () => {
  it("确认后冷却期内不重复，超过后再播报", () => {
    const s = initialFeedbackState();
    const cfg = { debounceMs: 800, cooldownMs: 3000 };
    const hit = withRule("squat-depth", true);
    pushFeedback(s, hit, 0, cfg);
    expect(pushFeedback(s, hit, 800, cfg)).toHaveLength(1);
    // lastFiredAt=800；800+2999 → 距上次 2999 < 3000
    expect(pushFeedback(s, hit, 800 + 2999, cfg)).toHaveLength(0);
    expect(pushFeedback(s, hit, 800 + 3000, cfg)).toHaveLength(1);
  });
});

describe("多规则", () => {
  it("多规则独立轨道可同时确认", () => {
    const s = initialFeedbackState();
    const two: ValidationResult = {
      status: "error",
      messages: ["a", "b"],
      results: [
        { id: "squat-depth", triggered: true, severity: "error", message: "a" },
        {
          id: "torso-upright",
          triggered: true,
          severity: "warning",
          message: "b",
        },
      ],
    };
    pushFeedback(s, two, 0);
    const cues = pushFeedback(s, two, D);
    expect(cues.map((c) => c.id).sort()).toEqual(["squat-depth", "torso-upright"]);
  });

  it("默认 debounce/cooldown 为缓冲区间", () => {
    expect(DEFAULT_FEEDBACK_CONFIG.debounceMs).toBe(800);
    expect(DEFAULT_FEEDBACK_CONFIG.cooldownMs).toBe(3000);
  });
});

describe("listConfirmedFeedback", () => {
  it("确认后列表含该规则", () => {
    const s = initialFeedbackState();
    const hit = withRule("knee-valgus-l", true);
    pushFeedback(s, hit, 0);
    pushFeedback(s, hit, D);
    expect(listConfirmedFeedback(s, hit, D)).toHaveLength(1);
  });

  it("未满 debounce 列表为空", () => {
    const s = initialFeedbackState();
    const hit = withRule("knee-valgus-l", true);
    pushFeedback(s, hit, 0);
    expect(listConfirmedFeedback(s, hit, D - 1)).toHaveLength(0);
  });

  it("确认后单帧未触发仍保持列表（解除防抖）", () => {
    const s = initialFeedbackState();
    const hit = withRule("torso-upright", true);
    // EMPTY 不含该规则 id → 视为相位不适用会立刻清；此处用 triggered:false 模拟同相位未触发
    const off: ValidationResult = {
      status: "correct",
      messages: [],
      results: [
        { id: "torso-upright", triggered: false, severity: "warning", message: "x" },
      ],
    };
    pushFeedback(s, hit, 0);
    pushFeedback(s, hit, D);
    pushFeedback(s, off, D + 50);
    expect(listConfirmedFeedback(s, off, D + 50)).toHaveLength(1);
    pushFeedback(s, off, D + 50 + D);
    expect(listConfirmedFeedback(s, off, D + 50 + D)).toHaveLength(0);
  });

  it("相位不再评估该规则时立刻松开 latch", () => {
    const s = initialFeedbackState();
    const hit = withRule("torso-upright", true);
    pushFeedback(s, hit, 0);
    pushFeedback(s, hit, D);
    // bottom 结果集无 torso → 立即清
    pushFeedback(s, EMPTY, D + 10);
    expect(listConfirmedFeedback(s, EMPTY, D + 10)).toHaveLength(0);
  });
});
