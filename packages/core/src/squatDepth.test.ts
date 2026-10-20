import { describe, expect, it } from "vitest";
import {
  initialCycleCounterState,
  stepCycleCounter,
} from "./cycleCounter.js";
import {
  initialSquatDepthState,
  readSquatDepth,
  SQUAT_CLOSE,
  SQUAT_STILL_STANDING,
} from "./squatDepth.js";
import { LandmarkIndex, type Landmark, type Pose } from "./types.js";

function pose(points: Partial<Record<number, Landmark>>): Pose {
  const out: Pose = [];
  for (const [index, lm] of Object.entries(points)) out[Number(index)] = lm;
  return out;
}

const stand = pose({
  [LandmarkIndex.LeftShoulder]: { x: 0.5, y: 0.25 },
  [LandmarkIndex.LeftHip]: { x: 0.5, y: 0.45 },
  [LandmarkIndex.LeftKnee]: { x: 0.5, y: 0.65 },
  [LandmarkIndex.LeftAnkle]: { x: 0.5, y: 0.85 },
});

describe("深蹲深度", () => {
  it("站直接近 1，髋靠近脚才到终点", () => {
    let state = initialSquatDepthState();
    const up = readSquatDepth(state, stand);
    state = up.state;
    expect(up.openness!).toBeGreaterThan(SQUAT_STILL_STANDING);

    const deep = readSquatDepth(
      state,
      pose({
        [LandmarkIndex.LeftShoulder]: { x: 0.5, y: 0.3 },
        [LandmarkIndex.LeftHip]: { x: 0.5, y: 0.55 },
        [LandmarkIndex.LeftKnee]: { x: 0.5, y: 0.72 },
        [LandmarkIndex.LeftAnkle]: { x: 0.5, y: 0.88 },
      }),
    );
    expect(deep.openness!).toBeLessThanOrEqual(SQUAT_CLOSE);
  });

  it("三维膝角很直时，仍采用更弯的画面膝角", () => {
    const bent: Pose = [];
    bent[LandmarkIndex.LeftShoulder] = { x: 0.4, y: 0.3 };
    bent[LandmarkIndex.LeftHip] = {
      x: 0.4,
      y: 0.5,
      wx: 0,
      wy: 0,
      wz: 0,
    };
    bent[LandmarkIndex.LeftKnee] = {
      x: 0.4,
      y: 0.7,
      wx: 0,
      wy: -0.4,
      wz: 0,
    };
    bent[LandmarkIndex.LeftAnkle] = {
      x: 0.62,
      y: 0.7,
      wx: 0,
      wy: -0.8,
      wz: 0,
    };
    let state = initialSquatDepthState();
    state = readSquatDepth(state, stand).state;
    const reading = readSquatDepth(state, bent);
    expect(reading.openness!).toBeLessThanOrEqual(SQUAT_CLOSE);
  });

  it("髋和膝都看不见时不把缺数当成蹲到底", () => {
    const reading = readSquatDepth(initialSquatDepthState(), []);
    expect(reading.openness).toBeNull();
  });

  it("只有明显下蹲再站起才计次，站着晃一下不计", () => {
    const deep = runOpenness(0.55);
    const wobble = runOpenness(0.94);
    expect(deep.count).toBeGreaterThan(0);
    expect(wobble.count).toBe(0);
  });
});

function runOpenness(low: number) {
  let state = initialCycleCounterState();
  for (let t = 0; t <= 4000; t += 50) {
    const s = Math.sin((2 * Math.PI * t) / 1000);
    const value = low + ((1 + s) / 2) * (1 - low);
    state = stepCycleCounter(state, {
      t,
      signals: [{ key: "drive", v: value }],
      finishBelow: SQUAT_CLOSE,
      levels: { standAbove: SQUAT_STILL_STANDING, bottomBelow: SQUAT_CLOSE },
    });
  }
  return state;
}
