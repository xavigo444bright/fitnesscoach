import { describe, expect, it } from "vitest";
import { muscleFill } from "./muscleFill.js";
import { colors, getTheme, layout, motion, radius } from "./theme.js";

describe("@fitness-coach/ui theme (MU-T2/T3)", () => {
  it("keeps FR-061 pose overlay colors unchanged (T10-1)", () => {
    expect(colors.correct).toBe("#22C55E");
    expect(colors.warning).toBe("#EAB308");
    expect(colors.error).toBe("#EF4444");
  });

  it("uses OLED shell background and white capsule CTA (T10-1 / MASTER)", () => {
    expect(colors.bg).toBe("#000000");
    expect(colors.surface).toBe("#121212");
    expect(colors.surfaceRaised).toBe("#1A1A1A");
    expect(colors.textPrimary).toBe("#FFFFFF");
    expect(colors.textSecondary).toBe("#A3A3A3");
    expect(colors.cta).toBe("#FFFFFF");
    expect(colors.onCta).toBe("#000000");
    expect(colors.border).toBe("#2A2A2A");
    expect(colors.tabBar).toMatch(/0\.92/);
    expect(radius.pill).toBe(999);
  });

  it("does not reuse pose green as shell CTA", () => {
    expect(colors.cta).not.toBe(colors.correct);
    expect(colors.cta).not.toBe(colors.primary);
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
    expect(t.fontFamily.display).toContain("Barlow");
    expect(t.fontFamily.body).toContain("Barlow");
    expect(t.fontFamily.fallback).toBe("System");
    expect(t.layout.tabBarInset).toBe(12);
    expect(t.layout.pageSectionGap).toBe(24);
    expect(t.radius.tabBar).toBe(28);
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
