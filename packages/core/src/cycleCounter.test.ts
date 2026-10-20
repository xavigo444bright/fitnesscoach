import { describe, expect, it } from "vitest";
import { LandmarkIndex, type JointTriplet, type Pose } from "./types.js";
import {
  initialCycleCounterState,
  signalsFromPose,
  stepCycleCounter,
  type CycleSignal,
} from "./cycleCounter.js";

function sine(periods: number, periodMs: number, amp: number, step = 50) {
  const samples: Array<{ t: number; v: number }> = [];
  const total = periods * periodMs;
  for (let t = 0; t <= total; t += step) {
    samples.push({
      t,
      v: Math.sin((2 * Math.PI * t) / periodMs) * amp,
    });
  }
  return samples;
}

function run(samples: Array<{ t: number; signals: CycleSignal[] }>) {
  let state = initialCycleCounterState();
  for (const sample of samples) state = stepCycleCounter(state, sample);
  return state;
}

function runOne(samples: Array<{ t: number; v: number }>, key = "s") {
  return run(
    samples.map((sample) => ({
      t: sample.t,
      signals: [{ key, v: sample.v }],
    })),
  );
}

describe("cycleCounter", () => {
  it("平滑来回数完整来回，幅度放大缩小次数一样", () => {
    const small = runOne(sine(4, 1000, 0.2));
    const large = runOne(sine(4, 1000, 80));
    expect(small.count).toBe(3);
    expect(large.count).toBe(small.count);
  });

  it("帧间噪声不计次", () => {
    let seed = 1;
    const next = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const samples = [];
    for (let t = 0; t <= 4000; t += 50) {
      samples.push({ t, v: (next() - 0.5) * 0.04 });
    }
    expect(runOne(samples).count).toBe(0);
  });

  it("顶点附近的小幅回撤不会把一次数成两次", () => {
    const base = sine(3, 1200, 1);
    const last = base[base.length - 1]!;
    const bounce = [];
    for (let i = 1; i <= 6; i += 1) {
      bounce.push({
        t: last.t + i * 40,
        v: last.v + (i % 2 === 0 ? 0.08 : -0.08),
      });
    }
    const clean = runOne(base);
    const noisy = runOne([...base, ...bounce]);
    expect(noisy.count).toBe(clean.count);
  });

  it("两次来回短于最小间隔只记一次", () => {
    const fast = runOne(sine(6, 220, 1, 20));
    expect(fast.count).toBeLessThan(5);
    expect(fast.count).toBeGreaterThan(0);
  });

  it("平的角度旁边有上下位移时，跟位移那条", () => {
    const samples = sine(4, 1000, 0.25).map((sample) => ({
      t: sample.t,
      signals: [
        { key: "ang", v: 90 },
        { key: "dy", v: sample.v },
      ],
    }));
    const state = run(samples);
    expect(state.lockedKey).toBe("dy");
    expect(state.count).toBeGreaterThan(0);
  });

  it("出画超过半秒丢掉未完成来回，已计入的次数还在", () => {
    const samples = sine(3, 1000, 1);
    let state = runOne(samples);
    const kept = state.count;
    expect(kept).toBeGreaterThan(0);
    state = stepCycleCounter(state, { t: samples.at(-1)!.t + 800, signals: [] });
    expect(state.count).toBe(kept);
    expect(state.trend).toBe("seek");
  });

  it("信号来自规则关节，看不见的点不产出数值", () => {
    const joints: JointTriplet = {
      a: LandmarkIndex.LeftShoulder,
      b: LandmarkIndex.LeftElbow,
      c: LandmarkIndex.LeftWrist,
    };
    const pose: Pose = [];
    pose[LandmarkIndex.LeftShoulder] = { x: 0.4, y: 0.3, visibility: 1 };
    pose[LandmarkIndex.RightShoulder] = { x: 0.6, y: 0.3, visibility: 1 };
    pose[LandmarkIndex.LeftElbow] = { x: 0.35, y: 0.5, visibility: 1 };
    pose[LandmarkIndex.LeftWrist] = { x: 0.35, y: 0.7, visibility: 0.1 };
    const signals = signalsFromPose(pose, [{ joints }]);
    const angle = signals.find((s) => s.key.startsWith("ang:"));
    expect(angle?.v).toBeNull();
  });

  it("传了终点时，只有到过终点的来回才计次", () => {
    const samples = sine(4, 1000, 40).map((sample) => ({
      t: sample.t,
      signals: [{ key: "drive", v: 140 + sample.v }],
      finishReached: sample.v < -25,
    }));
    const reached = run(samples);
    const missed = run(samples.map((sample) => ({ ...sample, finishReached: false })));
    const ungated = run(samples.map(({ t, signals }) => ({ t, signals })));
    expect(ungated.count).toBeGreaterThan(0);
    expect(reached.count).toBe(ungated.count);
    expect(missed.count).toBe(0);
  });
});
