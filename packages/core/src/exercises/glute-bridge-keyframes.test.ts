import { describe, expect, it } from "vitest";
import { LandmarkIndex } from "../types.js";
import { gluteBridgeHipAngle } from "../phase.js";
import {
  GLUTE_BRIDGE_GHOST_KEYFRAMES,
  GLUTE_BRIDGE_GHOST_SEQUENCE,
} from "./glute-bridge-keyframes.js";

describe("glute-bridge ghost keyframes", () => {
  it("序列含 stand→…→stand", () => {
    expect(GLUTE_BRIDGE_GHOST_SEQUENCE[0]).toBe("stand");
    expect(GLUTE_BRIDGE_GHOST_SEQUENCE.at(-1)).toBe("stand");
  });

  it("bottom 髋伸大于 stand（顶髋）", () => {
    const stand = gluteBridgeHipAngle(GLUTE_BRIDGE_GHOST_KEYFRAMES.stand.pose)!;
    const bottom = gluteBridgeHipAngle(
      GLUTE_BRIDGE_GHOST_KEYFRAMES.bottom.pose,
    )!;
    expect(bottom).toBeGreaterThan(stand);
    expect(bottom).toBeGreaterThan(160);
    expect(
      GLUTE_BRIDGE_GHOST_KEYFRAMES.stand.pose[LandmarkIndex.RightHip],
    ).toBeDefined();
  });
});
