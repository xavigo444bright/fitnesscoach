import { LandmarkIndex } from "../types.js";
import { describe, expect, it } from "vitest";
import { lungeWorkingKneeAngle } from "../phase.js";
import {
  LUNGE_GHOST_KEYFRAMES,
  LUNGE_GHOST_SEQUENCE,
} from "./lunge-keyframes.js";

describe("lunge ghost keyframes", () => {
  it("序列含 stand→…→stand", () => {
    expect(LUNGE_GHOST_SEQUENCE[0]).toBe("stand");
    expect(LUNGE_GHOST_SEQUENCE.at(-1)).toBe("stand");
  });

  it("bottom 工作膝小于 stand", () => {
    const stand = lungeWorkingKneeAngle(LUNGE_GHOST_KEYFRAMES.stand.pose)!;
    const bottom = lungeWorkingKneeAngle(LUNGE_GHOST_KEYFRAMES.bottom.pose)!;
    expect(bottom).toBeLessThan(stand);
    expect(bottom).toBeLessThan(100);
    expect(stand).toBeGreaterThan(150);
    expect(
      LUNGE_GHOST_KEYFRAMES.stand.pose[LandmarkIndex.RightHip],
    ).toBeDefined();
  });
});
