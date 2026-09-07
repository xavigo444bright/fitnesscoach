import { describe, expect, it } from "vitest";
import { muscleFill } from "./muscleFill.js";
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
    expect(layout.refPersonPipWidth).toBe(178);
    expect(layout.refPersonPipHeight).toBe(297);
  });

  it("getTheme returns stable object shape", () => {
    const t = getTheme();
    expect(t.colors.primary).toBe("#3B82F6");
    expect(t.layout.touchMin).toBe(44);
  });

  it("muscle fills distinguish chest / pelvis / thigh and active vs rest (FR-085)", () => {
    const chest = muscleFill("chest", "active");
    const pelvis = muscleFill("pelvis", "active");
    const thigh = muscleFill("thigh", "active");
    expect(chest).not.toBe(pelvis);
    expect(pelvis).not.toBe(thigh);
    expect(thigh).not.toBe(chest);
    expect(muscleFill("chest", "active")).not.toBe(muscleFill("chest", "rest"));
    expect(muscleFill("chest", "rest")).toBe(colors.muscleRest);
    expect(muscleFill("thigh", "rest")).toBe(colors.muscleRest);
    expect(muscleFill("head", "active")).toBe(colors.muscleRest);
    expect(chest).not.toBe(colors.correct);
    expect(chest).not.toBe(colors.warning);
    expect(chest).not.toBe(colors.error);
    expect(chest).not.toBe(colors.ref3d);
  });
});
