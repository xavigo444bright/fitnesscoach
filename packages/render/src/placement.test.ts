import { LandmarkIndex, type Pose } from "@fitness-coach/core";
import { describe, expect, it } from "vitest";
import {
  composePlacementHint,
  evaluatePlacement,
  allowSessionCount,
  formatPlacementCoachHint,
  placementConfigFor,
  PLANK_PLACEMENT_CONFIG,
} from "./placement.js";

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

  it("too_close when shoulders visible but both ankles missing（贴镜头）", () => {
    const pose = fullBody({
      [LandmarkIndex.LeftShoulder]: { x: 0.35, y: 0.2, visibility: 1 },
      [LandmarkIndex.RightShoulder]: { x: 0.65, y: 0.2, visibility: 1 },
    });
    pose[LandmarkIndex.LeftAnkle] = undefined;
    pose[LandmarkIndex.RightAnkle] = undefined;
    const r = evaluatePlacement(pose);
    expect(r.reason).toBe("too_close");
    expect(r.visible).toBe(true);
    expect(r.hint).toMatch(/放远|挡住/);
  });

  it("either_side：只看得见一侧髋踝也 ok（侧摄远侧遮挡）", () => {
    const pose = fullBody();
    pose[LandmarkIndex.LeftAnkle] = undefined;
    pose[LandmarkIndex.LeftHip] = undefined;
    const r = evaluatePlacement(pose, { hipAnkleMode: "either_side" });
    expect(r.reason).toBe("ok");
  });

  it("minVisibility 0.25：绘制可见的踝可通过（0.3）", () => {
    const r = evaluatePlacement(
      fullBody({
        [LandmarkIndex.LeftAnkle]: { x: 0.4, y: 0.85, visibility: 0.3 },
        [LandmarkIndex.RightAnkle]: { x: 0.6, y: 0.85, visibility: 0.3 },
      }),
      {
        minVisibility: 0.25,
        hipAnkleMode: "either_side",
      },
    );
    expect(r.reason).toBe("ok");
  });

  it("composePlacementHint：侧摄动作正对镜头 + 贴镜头", () => {
    const pose = fullBody({
      [LandmarkIndex.LeftShoulder]: { x: 0.3, y: 0.15, visibility: 1 },
      [LandmarkIndex.RightShoulder]: { x: 0.7, y: 0.15, visibility: 1 },
    });
    pose[LandmarkIndex.LeftAnkle] = undefined;
    pose[LandmarkIndex.RightAnkle] = undefined;
    const close = evaluatePlacement(pose);
    const hint = composePlacementHint(close, {
      recommendedCamera: "side",
      observedCamera: "front",
      jointsCue: "肩、髋、踝",
      holdSecond: true,
    });
    expect(hint).toMatch(/侧面/);
    expect(hint).toMatch(/放远/);
    expect(hint).toMatch(/计秒/);
  });

  it("composePlacementHint：正面计次动作侧对镜头", () => {
    const ok = evaluatePlacement(fullBody());
    const hint = composePlacementHint(ok, {
      recommendedCamera: "front",
      observedCamera: "side",
      jointsCue: "肩、肘",
      requireFrontPlane: true,
    });
    expect(hint).toMatch(/面对镜头/);
  });

  it("formatPlacementCoachHint：请调整姿势，不出现示范窗", () => {
    expect(formatPlacementCoachHint("请后退，让肩、肘、髋入画")).toBe(
      "请调整姿势 · 请后退，让肩、肘、髋入画",
    );
    expect(formatPlacementCoachHint("示范窗 · 请把手机放到身体侧面")).toBe(
      "请调整姿势 · 请把手机放到身体侧面",
    );
    expect(formatPlacementCoachHint("请调整姿势 · 请后退")).toBe(
      "请调整姿势 · 请后退",
    );
    expect(formatPlacementCoachHint(null)).toBeNull();
  });

  it("全画面贴边算入画（y=0.995），不再用内缩安全区判出画", () => {
    const r = evaluatePlacement(
      fullBody({
        [LandmarkIndex.LeftAnkle]: { x: 0.4, y: 0.995, visibility: 1 },
        [LandmarkIndex.RightAnkle]: { x: 0.6, y: 0.995, visibility: 1 },
      }),
    );
    expect(r.reason).toBe("ok");
  });

  it("坐标远离画面才 out_of_frame", () => {
    const r = evaluatePlacement(
      fullBody({
        [LandmarkIndex.LeftAnkle]: { x: 0.4, y: 1.4, visibility: 1 },
      }),
    );
    expect(r.reason).toBe("out_of_frame");
    expect(r.hint).toMatch(/放远|入画/);
  });

  it("hips_only：脚出画、髋可见 → ok（划船近景）", () => {
    const pose = fullBody({
      [LandmarkIndex.LeftShoulder]: { x: 0.4, y: 0.2, visibility: 1 },
      [LandmarkIndex.RightShoulder]: { x: 0.5, y: 0.2, visibility: 1 },
    });
    pose[LandmarkIndex.LeftAnkle] = undefined;
    pose[LandmarkIndex.RightAnkle] = undefined;
    expect(evaluatePlacement(pose).reason).toBe("too_close");
    expect(
      evaluatePlacement(pose, { hipAnkleMode: "hips_only" }).reason,
    ).toBe("ok");
  });

  it("placementConfigFor：划船不要求踝", () => {
    expect(placementConfigFor("db-row").hipAnkleMode).toBe("hips_only");
    expect(placementConfigFor("pullup").hipAnkleMode).toBe("hips_only");
    expect(placementConfigFor("db-fly").hipAnkleMode).toBe("hips_only");
    expect(placementConfigFor("dip").hipAnkleMode).toBe("hips_only");
    expect(placementConfigFor("chest-press-machine").hipAnkleMode).toBe(
      "hips_only",
    );
    expect(placementConfigFor("lateral-raise").hipAnkleMode).toBe("hips_only");
    expect(placementConfigFor("front-raise").hipAnkleMode).toBe("hips_only");
    expect(placementConfigFor("rear-delt-fly").hipAnkleMode).toBe("hips_only");
    expect(placementConfigFor("face-pull").hipAnkleMode).toBe("hips_only");
    expect(placementConfigFor("pike-pushup").hipAnkleMode).toBeUndefined();
    expect(placementConfigFor("incline-pushup").hipAnkleMode).toBeUndefined();
    expect(placementConfigFor("cable-crossover").hipAnkleMode).toBeUndefined();
    expect(placementConfigFor("plank").hipAnkleMode).toBe("either_side");
    expect(placementConfigFor("squat").hipAnkleMode).toBeUndefined();
    expect(placementConfigFor("rdl").hipAnkleMode).toBeUndefined();
  });

  it("allowSessionCount：有驱动角则不冻（FR-022）", () => {
    const missing = evaluatePlacement([]);
    expect(missing.reason).not.toBe("ok");
    expect(allowSessionCount(missing, 88)).toBe(true);
    expect(allowSessionCount(missing, null)).toBe(false);
    expect(allowSessionCount(evaluatePlacement(fullBody()), null)).toBe(true);
  });

  it("PLANK_PLACEMENT_CONFIG：只见一侧 + 脚贴底边也 ok", () => {
    const pose = fullBody({
      [LandmarkIndex.RightHip]: { x: 0.52, y: 0.55, visibility: 0.4 },
      [LandmarkIndex.RightAnkle]: { x: 0.52, y: 0.995, visibility: 0.28 },
    });
    pose[LandmarkIndex.LeftHip] = undefined;
    pose[LandmarkIndex.LeftAnkle] = undefined;
    expect(evaluatePlacement(pose).reason).toBe("missing_keypoints");
    expect(evaluatePlacement(pose, PLANK_PLACEMENT_CONFIG).reason).toBe("ok");
  });

  it("allows full-height framing when hips/ankles still in picture", () => {
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
