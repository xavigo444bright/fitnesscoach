import { LandmarkIndex } from "../types.js";
import { describe, expect, it } from "vitest";
import {
  SQUAT_GHOST_KEYFRAMES,
  SQUAT_GHOST_SEQUENCE,
} from "./squat-keyframes.js";

describe("squat ghost keyframes (M3-T6)", () => {
  it("defines stand / descend_mid / bottom / ascend_mid", () => {
    expect(Object.keys(SQUAT_GHOST_KEYFRAMES).sort()).toEqual([
      "ascend_mid",
      "bottom",
      "descend_mid",
      "stand",
    ]);
    expect(SQUAT_GHOST_SEQUENCE).toEqual([
      "stand",
      "descend_mid",
      "bottom",
      "ascend_mid",
      "stand",
    ]);
  });

  it("each keyframe has hip-knee-ankle landmarks", () => {
    for (const kf of Object.values(SQUAT_GHOST_KEYFRAMES)) {
      expect(kf.pose[LandmarkIndex.RightHip]).toBeTruthy();
      expect(kf.pose[LandmarkIndex.RightKnee]).toBeTruthy();
      expect(kf.pose[LandmarkIndex.RightAnkle]).toBeTruthy();
    }
  });
});
