import { describe, expect, it } from "vitest";
import type { Pose } from "@fitness-coach/core";
import { LandmarkIndex } from "@fitness-coach/core";
import { PoseSmoother, variance } from "./oneEuro.js";

describe("VT-P2-003 One Euro Filter 平滑后方差下降", () => {
  it("对静止+抖动信号，滤波后 x 方差更小", () => {
    const smoother = new PoseSmoother({
      freq: 30,
      minCutoff: 1.0,
      beta: 0.007,
      dCutoff: 1.0,
    });

    const rawXs: number[] = [];
    const smoothXs: number[] = [];
    const base = 0.5;

    for (let i = 0; i < 60; i += 1) {
      // 静止点 + 小幅噪声
      const noisy = base + (Math.sin(i * 17.3) * 0.02 + Math.cos(i * 9.1) * 0.015);
      const pose: Pose = [];
      pose[LandmarkIndex.LeftKnee] = { x: noisy, y: 0.7, visibility: 1 };
      rawXs.push(noisy);
      const out = smoother.smooth(pose, i * (1000 / 30));
      smoothXs.push(out[LandmarkIndex.LeftKnee]!.x);
    }

    expect(variance(smoothXs)).toBeLessThan(variance(rawXs));
  });

  it("缺失关键点保持 undefined", () => {
    const smoother = new PoseSmoother();
    const pose: Pose = [];
    pose[LandmarkIndex.LeftHip] = { x: 0.4, y: 0.5, visibility: 1 };
    const out = smoother.smooth(pose, 0);
    expect(out[LandmarkIndex.LeftHip]).toBeTruthy();
    expect(out[LandmarkIndex.LeftKnee]).toBeUndefined();
  });
});
