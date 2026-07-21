import { describe, expect, it } from "vitest";
import type { Pose } from "@fitness-coach/core";
import { LandmarkIndex, validate } from "@fitness-coach/core";
import {
  DEFAULT_VISIBILITY_THRESHOLD,
  filterByVisibility,
  isVisible,
} from "./visibility.js";

/** 侧面深蹲底位：右腿清晰，左腿「遮挡」低 visibility。 */
function occludedLeftLegPose(): Pose {
  const pose: Pose = [];
  // 右侧（清晰）— 深蹲膝角约 70°
  pose[LandmarkIndex.RightShoulder] = { x: 0.55, y: 0.2, visibility: 1 };
  pose[LandmarkIndex.RightHip] = { x: 0.55, y: 0.45, visibility: 1 };
  pose[LandmarkIndex.RightKnee] = { x: 0.7, y: 0.55, visibility: 1 };
  pose[LandmarkIndex.RightAnkle] = { x: 0.55, y: 0.75, visibility: 1 };
  // 左侧（遮挡）— 坐标会误触发 valgus，但 visibility 低
  pose[LandmarkIndex.LeftHip] = { x: 0.45, y: 0.45, visibility: 0.2 };
  pose[LandmarkIndex.LeftKnee] = { x: 0.2, y: 0.55, visibility: 0.1 };
  pose[LandmarkIndex.LeftAnkle] = { x: 0.45, y: 0.75, visibility: 0.15 };
  return pose;
}

describe("VT-P2-004 visibility 过滤", () => {
  it("默认阈值 0.5（FR-032）", () => {
    expect(DEFAULT_VISIBILITY_THRESHOLD).toBe(0.5);
  });

  it("visibility < 阈值 → 不可见；≥ 阈值 → 可见", () => {
    expect(isVisible({ x: 0, y: 0, visibility: 0.49 })).toBe(false);
    expect(isVisible({ x: 0, y: 0, visibility: 0.5 })).toBe(true);
    expect(isVisible({ x: 0, y: 0, visibility: 1 })).toBe(true);
    expect(isVisible(undefined)).toBe(false);
  });

  it("visibility 缺失视为可见", () => {
    expect(isVisible({ x: 0.1, y: 0.2 })).toBe(true);
  });

  it("filterByVisibility 剔除低置信度关节", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.LeftKnee] = { x: 0.3, y: 0.5, visibility: 0.2 };
    pose[LandmarkIndex.RightKnee] = { x: 0.7, y: 0.5, visibility: 0.9 };
    const out = filterByVisibility(pose);
    expect(out[LandmarkIndex.LeftKnee]).toBeUndefined();
    expect(out[LandmarkIndex.RightKnee]).toEqual({
      x: 0.7,
      y: 0.5,
      visibility: 0.9,
    });
  });

  it("遮挡一腿：过滤后低置信度侧不参与 validate", () => {
    const raw = occludedLeftLegPose();
    expect(raw[LandmarkIndex.LeftKnee]?.visibility).toBeLessThan(0.5);

    const filtered = filterByVisibility(raw);
    expect(filtered[LandmarkIndex.LeftKnee]).toBeUndefined();
    expect(filtered[LandmarkIndex.LeftHip]).toBeUndefined();
    expect(filtered[LandmarkIndex.LeftAnkle]).toBeUndefined();
    expect(filtered[LandmarkIndex.RightKnee]).toBeTruthy();

    // 侧摄 valgus 已禁用；过滤后右腿仍可校验且不因缺左腿崩溃
    const after = validate(filtered, "bottom");
    expect(after.results.some((r) => r.id === "knee-valgus-l" && r.triggered)).toBe(
      false,
    );
  });
});
