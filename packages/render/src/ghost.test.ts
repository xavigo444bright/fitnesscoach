import { LandmarkIndex } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import {
  alignGhostToUser,
  ghostPoseForExercise,
  ghostPoseForPhase,
  lerpPose,
} from "./ghost.js";

describe("ghost interpolation (M3-T6 / VT-P3B-001,002)", () => {
  it("lerpPose midpoints coordinates", () => {
    const a = [];
    const b = [];
    a[LandmarkIndex.RightKnee] = { x: 0, y: 0 };
    b[LandmarkIndex.RightKnee] = { x: 1, y: 1 };
    const m = lerpPose(a, b, 0.5);
    expect(m[LandmarkIndex.RightKnee]?.x).toBeCloseTo(0.5);
    expect(m[LandmarkIndex.RightKnee]?.y).toBeCloseTo(0.5);
  });

  it("stand / bottom differ at hip (knee y fixed by fixture geometry)", () => {
    const s = ghostPoseForPhase("stand", 170);
    const b = ghostPoseForPhase("bottom", 85);
    expect(s[LandmarkIndex.RightHip]?.y).not.toBe(
      b[LandmarkIndex.RightHip]?.y,
    );
  });

  it("descend mid hip y is between stand and bottom", () => {
    const standY = ghostPoseForPhase("stand", 170)[LandmarkIndex.RightHip]!.y;
    const bottomY = ghostPoseForPhase("bottom", 85)[LandmarkIndex.RightHip]!.y;
    const midY = ghostPoseForPhase("descend", 130)[LandmarkIndex.RightHip]!.y;
    expect(midY).toBeGreaterThan(Math.min(standY, bottomY) - 1e-9);
    expect(midY).toBeLessThan(Math.max(standY, bottomY) + 1e-9);
    expect(midY).not.toBeCloseTo(standY);
    expect(midY).not.toBeCloseTo(bottomY);
  });

  it("pushup ghostPoseForExercise bottom differs from stand", () => {
    const s = ghostPoseForExercise("pushup", "stand", 170);
    const b = ghostPoseForExercise("pushup", "bottom", 95);
    expect(s[LandmarkIndex.RightElbow]?.y).not.toBe(
      b[LandmarkIndex.RightWrist]?.y,
    );
    expect(s[LandmarkIndex.RightShoulder]).toBeDefined();
    expect(b[LandmarkIndex.RightWrist]).toBeDefined();
  });

  it("alignGhostToUser matches user hip–ankle span and hip anchor", () => {
    const ghost = ghostPoseForPhase("stand", 170);
    const user = [];
    user[LandmarkIndex.LeftHip] = { x: 0.3, y: 0.35 };
    user[LandmarkIndex.RightHip] = { x: 0.35, y: 0.35 };
    user[LandmarkIndex.LeftAnkle] = { x: 0.32, y: 0.92 };
    user[LandmarkIndex.RightAnkle] = { x: 0.36, y: 0.92 };
    const aligned = alignGhostToUser(ghost, user);
    const gHipY =
      ((aligned[LandmarkIndex.LeftHip]?.y ?? 0) +
        (aligned[LandmarkIndex.RightHip]?.y ?? 0)) /
      2;
    const gAnkleY =
      ((aligned[LandmarkIndex.LeftAnkle]?.y ?? 0) +
        (aligned[LandmarkIndex.RightAnkle]?.y ?? 0)) /
      2;
    expect(gHipY).toBeCloseTo(0.35, 2);
    expect(gAnkleY - gHipY).toBeCloseTo(0.57, 2);
  });
});
