import type { ValidationResult } from "@fitness-coach/core";
import { DEFAULT_FEEDBACK_CONFIG } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import { initialWiredFeedbackState, stepWiredFeedback } from "./wireFeedback.js";

const hit = (id: string): ValidationResult => ({
  status: "error",
  messages: ["x"],
  results: [{ id, triggered: true, severity: "error", message: "蹲得不够深" }],
});

const empty: ValidationResult = {
  status: "correct",
  messages: [],
  results: [],
};

/** 同相位未触发（结果集仍含该规则），用于测解除防抖；空结果集会被当成相位不适用立刻清 latch */
const off = (id: string): ValidationResult => ({
  status: "correct",
  messages: [],
  results: [{ id, triggered: false, severity: "error", message: "蹲得不够深" }],
});

const D = DEFAULT_FEEDBACK_CONFIG.debounceMs;

describe("stepWiredFeedback (M3-T4 / VT-P3A-004,005)", () => {
  it("single-frame blip does not show correcting (debounce)", () => {
    let state = initialWiredFeedbackState();
    const a = stepWiredFeedback(state, hit("squat-depth"), 0);
    expect(a.items).toHaveLength(0);
    expect(a.newCues).toHaveLength(0);
    state = a.state;
    const b = stepWiredFeedback(state, empty, 50);
    expect(b.items).toHaveLength(0);
  });

  it("shows correcting after debounce; no newCue during cooldown; recovers when cleared", () => {
    let state = initialWiredFeedbackState();
    state = stepWiredFeedback(state, hit("squat-depth"), 0).state;
    const confirmed = stepWiredFeedback(state, hit("squat-depth"), D);
    expect(confirmed.newCues).toHaveLength(1);
    expect(confirmed.items[0]?.phase).toBe("correcting");
    state = confirmed.state;

    const cooled = stepWiredFeedback(state, hit("squat-depth"), D + 1000);
    expect(cooled.newCues).toHaveLength(0);
    expect(cooled.items[0]?.phase).toBe("correcting");
    state = cooled.state;

    // 单帧变好：仍 correcting（解除防抖）
    const blip = stepWiredFeedback(state, off("squat-depth"), D + 1100);
    expect(blip.items[0]?.phase).toBe("correcting");
    expect(
      blip.displayValidation.results.some(
        (r) => r.id === "squat-depth" && r.triggered,
      ),
    ).toBe(true);
    state = blip.state;

    // 持续变好满 debounce 才 recovered
    const recovered = stepWiredFeedback(
      state,
      off("squat-depth"),
      D + 1100 + D,
    );
    expect(recovered.items[0]?.phase).toBe("recovered");
  });
});
