import { describe, expect, it } from "vitest";
import { FX_SQUAT_STAND } from "@fitness-coach/core";
import { MockPoseDetector } from "./mock.js";
import type { PoseDetector, PoseFrame } from "./types.js";

describe("pose-mp PoseDetector contract (M2B-T1)", () => {
  it("MockPoseDetector returns Pose compatible with core", () => {
    const detector: PoseDetector = new MockPoseDetector(FX_SQUAT_STAND.pose!);
    const frame: PoseFrame = { width: 192, height: 192, timestampMs: 0 };
    const pose = detector.detect(frame) as Awaited<
      ReturnType<PoseDetector["detect"]>
    >;
    expect(Array.isArray(pose)).toBe(true);
    expect(pose.length).toBeGreaterThan(0);
  });

  it("detect may be sync", () => {
    const d = new MockPoseDetector([]);
    expect(d.detect({ width: 1, height: 1, timestampMs: 1 })).toEqual([]);
  });
});
