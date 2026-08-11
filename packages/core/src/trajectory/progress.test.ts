import { describe, expect, it } from "vitest";
import { LandmarkIndex } from "../types.js";
import { sampleTrajectoryAt } from "./clean.js";
import {
  assertCanonicalStandQuality,
  checkCanonicalStandQuality,
  isArmsDownStand,
  progressByNearestDrive,
  progressFromPhaseDrive,
  standProgressOf,
} from "./progress.js";
import { getDemoTrajectory } from "./registry.js";
import { poseFromFrame } from "./serialize.js";
import type { DemoTrajectory } from "./types.js";

describe("trajectory progress (T7-2 / FR-068)", () => {
  it("stand→0 bottom→0.5；descend/ascend 随驱动角单调", () => {
    expect(progressFromPhaseDrive("stand", 175, "squat")).toBe(0);
    expect(progressFromPhaseDrive("bottom", 85, "squat")).toBe(0.5);
    const d1 = progressFromPhaseDrive("descend", 160, "squat");
    const d2 = progressFromPhaseDrive("descend", 100, "squat");
    expect(d1).toBeLessThan(d2);
    expect(d1).toBeGreaterThanOrEqual(0);
    expect(d2).toBeLessThanOrEqual(0.5);
    const a1 = progressFromPhaseDrive("ascend", 100, "squat");
    const a2 = progressFromPhaseDrive("ascend", 160, "squat");
    expect(a1).toBeLessThan(a2);
    expect(a1).toBeGreaterThanOrEqual(0.5);
    expect(a2).toBeLessThanOrEqual(1);
  });

  it("nearestDrive：站立固定稳定帧；最低点落在行程而非 idle stand", () => {
    const traj = getDemoTrajectory("squat");
    const drives = traj.frames
      .map((f) => f.driveDeg)
      .filter((d): d is number => d != null);
    const deepest = Math.min(...drives);
    const tDeep = progressByNearestDrive(traj, "bottom", deepest + 5);
    const tStand = progressByNearestDrive(traj, "stand", Math.max(...drives));
    expect(tStand).toBeCloseTo(standProgressOf(traj), 5);
    expect(tDeep).toBeGreaterThan(0.1);
    expect(tDeep).toBeLessThan(0.98);
    // 最低点与站立采样应拉开
    expect(Math.abs(tDeep - tStand)).toBeGreaterThan(0.08);
    // 行程取样不得落在片头 idle stand 堆
    const deepFrame = traj.frames.reduce((b, f) =>
      Math.abs(f.t - tDeep) < Math.abs(b.t - tDeep) ? f : b,
    );
    expect(deepFrame.phase).not.toBe("stand");
    const deepPose = poseFromFrame(sampleTrajectoryAt(traj, tDeep));
    expect(
      deepPose[LandmarkIndex.RightKnee] ?? deepPose[LandmarkIndex.LeftKnee],
    ).toBeTruthy();
  });

  it("standProgressOf：选垂臂直立帧（避开举手站立）", () => {
    const side = getDemoTrajectory("squat", "side");
    const front = getDemoTrajectory("squat", "front");
    const sidePose = poseFromFrame(
      sampleTrajectoryAt(side, standProgressOf(side)),
    );
    const frontPose = poseFromFrame(
      sampleTrajectoryAt(front, standProgressOf(front)),
    );
    const wristBelow = (pose: import("../types.js").Pose) => {
      const shY =
        ((pose[LandmarkIndex.LeftShoulder]?.y ?? 0) +
          (pose[LandmarkIndex.RightShoulder]?.y ?? 0)) /
        2;
      const lw = pose[LandmarkIndex.LeftWrist];
      const rw = pose[LandmarkIndex.RightWrist];
      if (!lw && !rw) return true;
      const wY = ((lw?.y ?? rw!.y) + (rw?.y ?? lw!.y)) / 2;
      return wY >= shY;
    };
    expect(wristBelow(sidePose)).toBe(true);
    expect(wristBelow(frontPose)).toBe(true);
    expect(isArmsDownStand(sidePose)).toBe(true);
    expect(isArmsDownStand(frontPose)).toBe(true);
  });

  it("assertCanonicalStandQuality：入库轨迹通过；举手 stand 失败", () => {
    for (const cam of ["side", "front"] as const) {
      const traj = getDemoTrajectory("squat", cam);
      expect(checkCanonicalStandQuality(traj).ok).toBe(true);
      expect(() => assertCanonicalStandQuality(traj)).not.toThrow();
    }

    const bad: DemoTrajectory = {
      schemaVersion: "1.0",
      id: "bad-arms-up",
      exerciseId: "squat",
      source: { type: "synthetic", label: "test" },
      meta: { landmarkScheme: "mediapipe33", cameraHint: "front" },
      frames: [
        {
          t: 0,
          phase: "stand",
          driveDeg: 170,
          landmarks: [
            { i: LandmarkIndex.LeftShoulder, x: 0.4, y: 0.3 },
            { i: LandmarkIndex.RightShoulder, x: 0.6, y: 0.3 },
            { i: LandmarkIndex.LeftHip, x: 0.42, y: 0.5 },
            { i: LandmarkIndex.RightHip, x: 0.58, y: 0.5 },
            { i: LandmarkIndex.LeftKnee, x: 0.42, y: 0.7 },
            { i: LandmarkIndex.RightKnee, x: 0.58, y: 0.7 },
            { i: LandmarkIndex.LeftAnkle, x: 0.42, y: 0.9 },
            { i: LandmarkIndex.RightAnkle, x: 0.58, y: 0.9 },
            // 举手：腕在肩上方
            { i: LandmarkIndex.LeftWrist, x: 0.35, y: 0.12 },
            { i: LandmarkIndex.RightWrist, x: 0.65, y: 0.12 },
          ],
        },
      ],
    };
    expect(checkCanonicalStandQuality(bad).ok).toBe(false);
    expect(() => assertCanonicalStandQuality(bad)).toThrow(/举手/);
  });
});
