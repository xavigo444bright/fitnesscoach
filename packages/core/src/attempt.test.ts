import { describe, expect, it } from "vitest";
import {
  initialAttemptState,
  stepAttempt,
  type AttemptObs,
} from "./attempt.js";

function obs(progress: number, extra: Partial<AttemptObs> = {}): AttemptObs {
  return {
    progress,
    atStart: progress <= 0.15,
    atFinish: progress >= 1,
    shortTravel: 0.55,
    ...extra,
  };
}

function run(samples: Array<AttemptObs | null>, stepMs = 50) {
  let state = initialAttemptState();
  const seen: string[] = [];
  samples.forEach((sample, i) => {
    state = stepAttempt(state, { t: i * stepMs, obs: sample });
    if (state.lastOutcome) seen.push(state.lastOutcome.type);
  });
  return { state, seen };
}

describe("一次尝试", () => {
  it("回到起始才加次，下一次离开时不加", () => {
    const down = [0.2, 0.4, 0.7, 1.05, 1.1, 1.1, 0.7, 0.3];
    const back = [0.1, 0.05, 0.05];
    const again = [0.4, 0.5, 0.6];
    const { state, seen } = run(
      [...down, ...back, ...again].map((progress) => obs(progress)),
    );
    expect(seen).toEqual(["counted"]);
    expect(state.count).toBe(1);
    expect(state.status).toBe("outbound");
  });

  it("走出一段但没到完成，提示并且不加次", () => {
    const { state, seen } = run(
      [0.4, 0.6, 0.7, 0.7, 0.4, 0.1, 0.05].map((progress) => obs(progress)),
    );
    expect(seen).toEqual(["short"]);
    expect(state.count).toBe(0);
    expect(state.lastOutcome).toEqual({ type: "short" });
  });

  it("行程到位但方向不被接受时，回来只提示不加次", () => {
    const up = [0.4, 0.7, 1.05, 1.1, 1.1].map((progress) =>
      obs(progress, { counts: false }),
    );
    const back = [0.1, 0.05].map((progress) => obs(progress, { counts: false }));
    const { state, seen } = run([...up, ...back]);
    expect(seen).toEqual(["short"]);
    expect(state.count).toBe(0);
  });

  it("站着小幅晃动，不加次也不提示", () => {
    const { state, seen } = run(
      [0.05, 0.2, 0.22, 0.18, 0.05, 0.04].map((progress) => obs(progress)),
    );
    expect(seen).toEqual([]);
    expect(state.count).toBe(0);
  });

  it("到底弹一下仍算一次", () => {
    const samples = [0.4, 0.8, 1.1, 1.2, 1.15, 0.7, 1.05, 1.1, 0.4, 0.08, 0.05];
    const { state, seen } = run(samples.map((progress) => obs(progress)));
    expect(seen).toEqual(["counted"]);
    expect(state.count).toBe(1);
  });

  it("完成只闪了一帧，不算到过", () => {
    const { state, seen } = run(
      [0.4, 0.8, 1.2, 0.5, 0.1, 0.05].map((progress) => obs(progress)),
    );
    expect(seen).toEqual(["short"]);
    expect(state.count).toBe(0);
  });

  it("空帧超过半秒，尝试作废，不提示", () => {
    let state = initialAttemptState();
    for (let i = 0; i < 5; i += 1) {
      state = stepAttempt(state, { t: i * 50, obs: obs(0.7) });
    }
    expect(state.status).toBe("outbound");
    state = stepAttempt(state, { t: 1000, obs: null });
    expect(state.status).toBe("idle");
    expect(state.lastOutcome).toBeNull();
    expect(state.count).toBe(0);
  });

  it("短空帧把同一次尝试接上", () => {
    let state = initialAttemptState();
    for (let i = 0; i < 4; i += 1) {
      state = stepAttempt(state, { t: i * 40, obs: obs(0.6) });
    }
    state = stepAttempt(state, { t: 200, obs: null });
    expect(state.status).toBe("outbound");
    const done = [1.1, 1.15, 1.2, 0.4, 0.08, 0.04];
    const seen: string[] = [];
    done.forEach((progress, i) => {
      state = stepAttempt(state, { t: 240 + i * 40, obs: obs(progress) });
      if (state.lastOutcome) seen.push(state.lastOutcome.type);
    });
    expect(seen).toEqual(["counted"]);
  });
});
