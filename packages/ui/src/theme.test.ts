import { describe, expect, it } from "vitest";
import { colors, getTheme, layout, motion } from "./theme.js";

describe("@fitness-coach/ui theme (MU-T2/T3)", () => {
  it("maps FR-061 semantic colors", () => {
    expect(colors.correct).toBe("#22C55E");
    expect(colors.warning).toBe("#EAB308");
    expect(colors.error).toBe("#EF4444");
  });

  it("uses dark training background (UI-012)", () => {
    expect(colors.bg.toLowerCase()).not.toBe("#ffffff");
    expect(colors.bg).toBe("#0F172A");
  });

  it("exposes FeedbackBar recovered duration and max lines", () => {
    expect(motion.feedbackRecoveredMs).toBeGreaterThanOrEqual(1500);
    expect(motion.feedbackRecoveredMs).toBeLessThanOrEqual(2000);
    expect(motion.correctCheckMs).toBe(700);
    expect(layout.feedbackBarMaxLines).toBe(2);
    expect(layout.placementGuideAspect).toBe(0.48);
  });

  it("getTheme returns stable object shape", () => {
    const t = getTheme();
    expect(t.colors.primary).toBe("#3B82F6");
    expect(t.layout.touchMin).toBe(44);
  });
});
