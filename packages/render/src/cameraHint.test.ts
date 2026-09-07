import { LandmarkIndex, type Pose } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import {
  CameraHintLatch,
  inferCameraHint,
  inferCameraHintDetailed,
} from "./cameraHint.js";

function frontPose(): Pose {
  const p: Pose = [];
  p[LandmarkIndex.LeftShoulder] = { x: 0.35, y: 0.25 };
  p[LandmarkIndex.RightShoulder] = { x: 0.65, y: 0.25 };
  p[LandmarkIndex.LeftHip] = { x: 0.4, y: 0.5 };
  p[LandmarkIndex.RightHip] = { x: 0.6, y: 0.5 };
  p[LandmarkIndex.LeftAnkle] = { x: 0.42, y: 0.9 };
  p[LandmarkIndex.RightAnkle] = { x: 0.58, y: 0.9 };
  return p;
}

function sidePose(): Pose {
  const p: Pose = [];
  p[LandmarkIndex.LeftShoulder] = { x: 0.5, y: 0.25 };
  p[LandmarkIndex.RightShoulder] = { x: 0.52, y: 0.25 };
  p[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.5 };
  p[LandmarkIndex.RightHip] = { x: 0.51, y: 0.5 };
  p[LandmarkIndex.LeftAnkle] = { x: 0.49, y: 0.9 };
  p[LandmarkIndex.RightAnkle] = { x: 0.5, y: 0.9 };
  return p;
}

describe("cameraHint (FR-068 front/side auto)", () => {
  it("区分正面与侧面", () => {
    expect(inferCameraHint(frontPose())).toBe("front");
    expect(inferCameraHint(sidePose())).toBe("side");
    expect(inferCameraHintDetailed(frontPose()).spanRatio).toBeGreaterThan(
      inferCameraHintDetailed(sidePose()).spanRatio,
    );
  });

  it("近景侧面：瞎猜宽髋不判成正面；髋出画仍可靠肩判侧", () => {
    const stacked: Pose = [];
    stacked[LandmarkIndex.LeftShoulder] = { x: 0.5, y: 0.3 };
    stacked[LandmarkIndex.RightShoulder] = { x: 0.52, y: 0.3 };
    stacked[LandmarkIndex.LeftHip] = { x: 0.2, y: 0.55, visibility: 0.35 };
    stacked[LandmarkIndex.RightHip] = { x: 0.8, y: 0.55, visibility: 0.35 };
    expect(inferCameraHint(stacked)).toBe("side");

    const noHip: Pose = [];
    noHip[LandmarkIndex.LeftShoulder] = { x: 0.5, y: 0.32 };
    noHip[LandmarkIndex.RightShoulder] = { x: 0.52, y: 0.3 };
    expect(inferCameraHint(noHip)).toBe("side");
  });

  it("CameraHintLatch：行程中禁止切换，stand 可切", () => {
    const latch = new CameraHintLatch(4);
    for (let i = 0; i < 4; i += 1) {
      latch.update("side", { confidence: 1, allowFlip: true });
    }
    expect(latch.value).toBe("side");

    for (let i = 0; i < 6; i += 1) {
      expect(
        latch.update("front", { confidence: 1, allowFlip: false }),
      ).toBe("side");
    }

    for (let i = 0; i < 3; i += 1) {
      expect(
        latch.update("front", { confidence: 1, allowFlip: true }),
      ).toBe("side");
    }
    expect(latch.update("front", { confidence: 1, allowFlip: true })).toBe(
      "front",
    );
  });
});
