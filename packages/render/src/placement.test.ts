import { LandmarkIndex, type Pose } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import { evaluatePlacement } from "./placement.js";

function fullBody(overrides: Partial<Record<number, { x: number; y: number; visibility?: number }>> = {}): Pose {
  const base: Record<number, { x: number; y: number; visibility?: number }> = {
    [LandmarkIndex.LeftHip]: { x: 0.4, y: 0.5, visibility: 1 },
    [LandmarkIndex.RightHip]: { x: 0.6, y: 0.5, visibility: 1 },
    [LandmarkIndex.LeftAnkle]: { x: 0.4, y: 0.9, visibility: 1 },
    [LandmarkIndex.RightAnkle]: { x: 0.6, y: 0.9, visibility: 1 },
    ...overrides,
  };
  const pose: Pose = [];
  for (const [k, v] of Object.entries(base)) {
    pose[Number(k)] = v;
  }
  return pose;
}

describe("evaluatePlacement (M3-T5 / VT-P3A-006 / FR-022)", () => {
  it("ok when hips and ankles in frame", () => {
    expect(evaluatePlacement(fullBody()).reason).toBe("ok");
    expect(evaluatePlacement(fullBody()).visible).toBe(false);
  });

  it("guides when ankle missing", () => {
    const pose = fullBody();
    pose[LandmarkIndex.LeftAnkle] = undefined;
    const r = evaluatePlacement(pose);
    expect(r.visible).toBe(true);
    expect(r.reason).toBe("missing_keypoints");
    expect(r.hint).toMatch(/髋|入画/);
  });

  it("guides when ankle out of frame", () => {
    const r = evaluatePlacement(
      fullBody({
        [LandmarkIndex.LeftAnkle]: { x: 0.4, y: 0.99, visibility: 1 },
      }),
    );
    expect(r.reason).toBe("out_of_frame");
    expect(r.hint).toMatch(/退|入画/);
  });

  it("allows closer framing when hips/ankles still in margin", () => {
    // span 0.90 < maxBodySpanY 0.98
    const r = evaluatePlacement(
      fullBody({
        [LandmarkIndex.LeftHip]: { x: 0.4, y: 0.05, visibility: 1 },
        [LandmarkIndex.RightHip]: { x: 0.6, y: 0.05, visibility: 1 },
        [LandmarkIndex.LeftAnkle]: { x: 0.4, y: 0.95, visibility: 1 },
        [LandmarkIndex.RightAnkle]: { x: 0.6, y: 0.95, visibility: 1 },
      }),
    );
    expect(r.reason).toBe("ok");
    expect(r.visible).toBe(false);
  });
});
