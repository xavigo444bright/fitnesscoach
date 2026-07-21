import { LandmarkIndex } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import {
  extractMediapipeLandmarks,
  poseFromMediapipeEvent,
  timestampMsFromMediapipeEvent,
} from "./mediapipe.js";

describe("mediapipe adapter (M2A-T4)", () => {
  it("extracts landmarks from iOS-shaped event", () => {
    const raw = extractMediapipeLandmarks({
      landmarks: [
        { x: 0.1, y: 0.2, z: 0.3, visibility: 0.9 },
        { x: 0.4, y: 0.5 },
      ],
    });
    expect(raw).toHaveLength(2);
    expect(raw?.[0]).toMatchObject({ x: 0.1, y: 0.2 });
  });

  it("maps to Pose with visibility and sparse undefined", () => {
    const pose = poseFromMediapipeEvent({
      landmarks: Array.from({ length: 33 }, (_, i) => {
        if (i === LandmarkIndex.LeftKnee) {
          return { x: 0.5, y: 0.6, z: 0.1, visibility: 0.8 };
        }
        if (i === 0) return { x: "bad", y: 0.1 };
        return { x: i / 33, y: i / 33, visibility: 1 };
      }),
    });
    expect(pose).not.toBeNull();
    expect(pose![0]).toBeUndefined();
    expect(pose![LandmarkIndex.LeftKnee]).toEqual({
      x: 0.5,
      y: 0.6,
      z: 0.1,
      visibility: 0.8,
    });
    expect(pose).toHaveLength(33);
  });

  it("reads timestamp from additionalData (seconds → ms)", () => {
    const ms = timestampMsFromMediapipeEvent(
      { additionalData: { presentationTimeStamp: 12.5 } },
      0,
    );
    expect(ms).toBe(12500);
  });

  it("returns null when no landmarks", () => {
    expect(poseFromMediapipeEvent({})).toBeNull();
    expect(poseFromMediapipeEvent(null)).toBeNull();
  });
});
