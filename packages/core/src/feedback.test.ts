import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEEDBACK_CONFIG,
  initialFeedbackState,
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

describe("VT-P1-007 防抖：单帧不触发，持续 300ms 才触发", () => {
  it("单帧错误不播报", () => {
    const s = initialFeedbackState();
    const cues = pushFeedback(s, withRule("squat-depth", true), 0);
    expect(cues).toHaveLength(0);
  });

  it("持续未满 300ms 不播报，满 300ms 播报", () => {
    const s = initialFeedbackState();
    pushFeedback(s, withRule("squat-depth", true), 0);
    expect(pushFeedback(s, withRule("squat-depth", true), 200)).toHaveLength(0);
    expect(pushFeedback(s, withRule("squat-depth", true), 300)).toHaveLength(1);
  });

  it("中途中断则重新计时", () => {
    const s = initialFeedbackState();
    pushFeedback(s, withRule("squat-depth", true), 0);
    pushFeedback(s, withRule("squat-depth", true), 200);
    // 第 250ms 未触发 → 清空计时
    pushFeedback(s, EMPTY, 250);
    // 从 300ms 重新开始，310ms 时才 10ms，不播报
    expect(pushFeedback(s, withRule("squat-depth", true), 300)).toHaveLength(0);
    expect(pushFeedback(s, withRule("squat-depth", true), 600)).toHaveLength(1);
  });
});

describe("VT-P1-008 冷却：2s 内同错误不重复", () => {
  it("确认后 2s 内不重复，超过 2s 再播报", () => {
    const s = initialFeedbackState();
    pushFeedback(s, withRule("squat-depth", true), 0);
    const first = pushFeedback(s, withRule("squat-depth", true), 300);
    expect(first).toHaveLength(1);
    // 冷却期内（300→2000）持续触发不重复
    expect(pushFeedback(s, withRule("squat-depth", true), 1000)).toHaveLength(0);
    expect(pushFeedback(s, withRule("squat-depth", true), 2200)).toHaveLength(0);
    // 距上次播报（300）超过 2000ms → 2301ms 再播报
    expect(pushFeedback(s, withRule("squat-depth", true), 2301)).toHaveLength(1);
  });

  it("不同错误各自独立冷却", () => {
    const s = initialFeedbackState();
    const two: ValidationResult = {
      status: "error",
      messages: ["a", "b"],
      results: [
        { id: "squat-depth", triggered: true, severity: "error", message: "a" },
        { id: "torso-upright", triggered: true, severity: "warning", message: "b" },
      ],
    };
    pushFeedback(s, two, 0);
    const cues = pushFeedback(s, two, 300);
    expect(cues.map((c) => c.id).sort()).toEqual(["squat-depth", "torso-upright"]);
  });
});

describe("配置默认值", () => {
  it("debounce 300 / cooldown 2000", () => {
    expect(DEFAULT_FEEDBACK_CONFIG.debounceMs).toBe(300);
    expect(DEFAULT_FEEDBACK_CONFIG.cooldownMs).toBe(2000);
  });
});
