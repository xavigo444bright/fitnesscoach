import { describe, expect, it } from "vitest";
import { LandmarkIndex } from "../types.js";
import { pushupElbowAngle } from "../phase.js";
import {
  PUSHUP_GHOST_KEYFRAMES,
  PUSHUP_GHOST_SEQUENCE,
} from "./pushup-keyframes.js";

describe("pushup ghost keyframes", () => {
  it("序列含 stand→…→stand", () => {
    expect(PUSHUP_GHOST_SEQUENCE[0]).toBe("stand");
    expect(PUSHUP_GHOST_SEQUENCE.at(-1)).toBe("stand");
  });

  it("bottom 肘角低于 stand", () => {
    const stand = pushupElbowAngle(PUSHUP_GHOST_KEYFRAMES.stand.pose)!;
    const bottom = pushupElbowAngle(PUSHUP_GHOST_KEYFRAMES.bottom.pose)!;
    expect(bottom).toBeLessThan(stand);
    expect(bottom).toBeLessThan(120);
    expect(
      PUSHUP_GHOST_KEYFRAMES.stand.pose[LandmarkIndex.RightShoulder],
    ).toBeDefined();
  });
});
