import { describe, expect, it } from "vitest";
import { LandmarkIndex, type Landmark } from "@fitness-coach/core";
import { MockPoseDetector } from "./mock.js";
import type { PoseDetector, PoseFrame } from "./types.js";

describe("VT-P2-001 pose-native 接口契约", () => {
  it("PoseDetector.detect(frame) 返回 Pose（Landmark 数组）", () => {
    const landmarks: Landmark[] = [];
    landmarks[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.5, visibility: 1 };
    landmarks[LandmarkIndex.LeftKnee] = { x: 0.5, y: 0.7, visibility: 1 };
    landmarks[LandmarkIndex.LeftAnkle] = { x: 0.5, y: 0.9, visibility: 1 };

    const detector: PoseDetector = new MockPoseDetector(landmarks);
    const frame: PoseFrame = { width: 640, height: 480, timestampMs: 0 };
    const pose = detector.detect(frame) as Awaited<ReturnType<PoseDetector["detect"]>>;

    expect(Array.isArray(pose)).toBe(true);
    expect(pose[LandmarkIndex.LeftKnee]?.x).toBe(0.5);
    expect(pose[LandmarkIndex.LeftKnee]?.visibility).toBe(1);
  });

  it("Landmark 形状与 core 一致（x/y/visibility）", () => {
    const lm: Landmark = { x: 0.1, y: 0.2, z: 0, visibility: 0.9 };
    expect(lm.x).toBeTypeOf("number");
    expect(lm.y).toBeTypeOf("number");
  });

  it("MockPoseDetector 可 dispose", () => {
    const d = new MockPoseDetector();
    expect(() => d.dispose()).not.toThrow();
  });
});
