import { describe, expect, it } from "vitest";
import {
  lateralRaiseDriveDeg,
  lateralRaiseShoulderReached,
} from "./phase.js";
import { LandmarkIndex, type Landmark, type Pose } from "./types.js";

function arm(
  image: { x: number; y: number },
  world: { wx: number; wy: number; wz: number },
): Landmark {
  return { ...image, ...world, visibility: 1 };
}

describe("侧平举世界坐标外展", () => {
  it("手臂抬到肩高，驱动角落到下端；弯腰但手臂垂着仍是站直", () => {
    const raised: Pose = [];
    raised[LandmarkIndex.LeftShoulder] = arm(
      { x: 0.45, y: 0.35 },
      { wx: 0, wy: 0, wz: 0 },
    );
    raised[LandmarkIndex.LeftElbow] = arm(
      { x: 0.2, y: 0.35 },
      { wx: -0.25, wy: 0, wz: 0 },
    );
    raised[LandmarkIndex.LeftWrist] = arm(
      { x: 0.02, y: 0.35 },
      { wx: -0.55, wy: 0.02, wz: 0 },
    );
    const bowed: Pose = [];
    bowed[LandmarkIndex.LeftShoulder] = arm(
      { x: 0.5, y: 0.4 },
      { wx: 0, wy: 0, wz: 0 },
    );
    bowed[LandmarkIndex.LeftElbow] = arm(
      { x: 0.2, y: 0.55 },
      { wx: 0.02, wy: -0.25, wz: 0.04 },
    );
    bowed[LandmarkIndex.LeftWrist] = arm(
      { x: 0.02, y: 0.7 },
      { wx: 0.03, wy: -0.5, wz: 0.05 },
    );
    expect(lateralRaiseDriveDeg(raised)!).toBeLessThan(100);
    expect(lateralRaiseDriveDeg(bowed)!).toBeGreaterThan(155);
  });
});

describe("侧平举终点是肩，不是角度", () => {
  const shoulder = { x: 0.4, y: 0.4, wx: 0, wy: 0, wz: 0, visibility: 1 };

  function pose(tip: Landmark): Pose {
    const out: Pose = [];
    out[LandmarkIndex.LeftShoulder] = shoulder;
    out[LandmarkIndex.LeftWrist] = tip;
    return out;
  }

  it("手向两侧升到肩算到了", () => {
    expect(
      lateralRaiseShoulderReached(
        pose(arm({ x: 0.05, y: 0.4 }, { wx: -0.55, wy: 0, wz: 0.02 })),
      ),
    ).toBe(true);
  });

  it("只抬到一半，手还低于肩", () => {
    expect(
      lateralRaiseShoulderReached(
        pose(arm({ x: 0.15, y: 0.62 }, { wx: -0.35, wy: -0.4, wz: 0.02 })),
      ),
    ).toBe(false);
  });

  it("手升到肩高但是往前举", () => {
    expect(
      lateralRaiseShoulderReached(
        pose(arm({ x: 0.42, y: 0.18 }, { wx: 0.05, wy: 0.02, wz: 0.55 })),
      ),
    ).toBe(false);
  });

  it("手臂垂着弯腰，手没有到肩", () => {
    expect(
      lateralRaiseShoulderReached(
        pose(arm({ x: 0.02, y: 0.7 }, { wx: 0.04, wy: -0.5, wz: 0.08 })),
      ),
    ).toBe(false);
  });
});
