import { describe, expect, it } from "vitest";
import {
  AdaptiveQualityController,
  QUALITY_PROFILES,
} from "./adaptiveQuality.js";

describe("AdaptiveQualityController (M2A-T5 / VT-P2-006)", () => {
  it("starts at high profile", () => {
    const c = new AdaptiveQualityController();
    expect(c.profile()).toEqual(QUALITY_PROFILES.high);
  });

  it("manual cycle high → medium → low → high", () => {
    const c = new AdaptiveQualityController();
    expect(c.cycleManual(1000).tier).toBe("medium");
    expect(c.cycleManual(2000).tier).toBe("low");
    expect(c.cycleManual(3000).tier).toBe("high");
    expect(c.isManual()).toBe(true);
  });

  it("auto-degrades when fps below drop threshold after cooldown", () => {
    const c = new AdaptiveQualityController({
      dropBelowFps: 12,
      raiseAboveFps: 22,
      cooldownMs: 1000,
    });
    expect(c.observeFps(10, 0).tier).toBe("medium");
    // still in cooldown
    expect(c.observeFps(10, 500).tier).toBe("medium");
    expect(c.observeFps(10, 1100).tier).toBe("low");
  });

  it("auto-raises when fps recovers", () => {
    const c = new AdaptiveQualityController({
      dropBelowFps: 12,
      raiseAboveFps: 22,
      cooldownMs: 100,
    });
    c.observeFps(8, 0);
    c.observeFps(8, 200);
    expect(c.profile().tier).toBe("low");
    expect(c.observeFps(25, 400).tier).toBe("medium");
    expect(c.observeFps(25, 600).tier).toBe("high");
  });

  it("manual mode ignores auto observe", () => {
    const c = new AdaptiveQualityController({ cooldownMs: 0 });
    c.setManualTier("high", 0);
    expect(c.observeFps(5, 100).tier).toBe("high");
  });

  it("shouldProcessFrame respects processEveryN on low tier", () => {
    const c = new AdaptiveQualityController();
    c.setManualTier("low");
    expect(c.shouldProcessFrame()).toBe(false); // 1 % 2
    expect(c.shouldProcessFrame()).toBe(true); // 2 % 2
    expect(c.shouldProcessFrame()).toBe(false);
  });

  it("low tier has lower frameLimit and inputScale than high", () => {
    expect(QUALITY_PROFILES.low.frameLimit).toBeLessThan(
      QUALITY_PROFILES.high.frameLimit,
    );
    expect(QUALITY_PROFILES.low.inputScale).toBeLessThan(
      QUALITY_PROFILES.high.inputScale,
    );
  });
});
