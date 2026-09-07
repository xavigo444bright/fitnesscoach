import { describe, expect, it } from "vitest";
import {
  cameraMotionVerdict,
  meanCornerSad,
  reportFromGrayFrames,
} from "./cameraMotion.js";

describe("camera motion estimate", () => {
  it("treats identical frames as locked", () => {
    const a = new Uint8Array(160 * 90);
    a.fill(40);
    expect(meanCornerSad(a, a, 160, 90)).toBe(0);
    expect(cameraMotionVerdict(0.01)).toBe("locked");
    expect(cameraMotionVerdict(0.07)).toBe("handheld");
    expect(cameraMotionVerdict(0.2)).toBe("moving");
  });

  it("flags a large corner shift as moving", () => {
    const a = new Uint8Array(160 * 90);
    const b = new Uint8Array(160 * 90);
    a.fill(10);
    b.fill(200);
    const report = reportFromGrayFrames([a, b]);
    expect(report.verdict).toBe("moving");
    expect(report.trajectoryOk).toBe(false);
  });
});
