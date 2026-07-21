import { LandmarkIndex, type Pose } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOW_LIGHT_MEAN_VISIBILITY,
  evaluateLowLight,
  LOW_LIGHT_HINT,
  meanKeypointVisibility,
} from "./lowLight.js";

function poseWithVis(vis: number): Pose {
  const pose: Pose = [];
  for (const i of [
    LandmarkIndex.LeftShoulder,
    LandmarkIndex.RightShoulder,
    LandmarkIndex.LeftHip,
    LandmarkIndex.RightHip,
    LandmarkIndex.LeftKnee,
    LandmarkIndex.RightKnee,
    LandmarkIndex.LeftAnkle,
    LandmarkIndex.RightAnkle,
  ]) {
    pose[i] = { x: 0.5, y: 0.5, visibility: vis };
  }
  return pose;
}

describe("VT-P4-001 / FR-023 弱光检测", () => {
  it("默认阈值 0.4", () => {
    expect(DEFAULT_LOW_LIGHT_MEAN_VISIBILITY).toBe(0.4);
  });

  it("高 visibility → 不提示", () => {
    const r = evaluateLowLight(poseWithVis(0.9));
    expect(r.lowLight).toBe(false);
    expect(r.hint).toBeNull();
    expect(r.meanVisibility).toBeCloseTo(0.9);
  });

  it("低 visibility → 请改善光线", () => {
    const r = evaluateLowLight(poseWithVis(0.2));
    expect(r.lowLight).toBe(true);
    expect(r.hint).toBe(LOW_LIGHT_HINT);
  });

  it("meanKeypointVisibility 跳过缺失点", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.LeftHip] = { x: 0, y: 0, visibility: 0.5 };
    pose[LandmarkIndex.RightHip] = { x: 0, y: 0, visibility: 0.3 };
    expect(meanKeypointVisibility(pose)).toBeCloseTo(0.4);
  });
});
