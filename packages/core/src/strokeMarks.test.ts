import { describe, expect, it } from "vitest";
import { EXERCISE_CATALOG } from "./exercises/catalog.js";
import { readAttemptRegion, usesAttempt } from "./attemptRegions.js";
import {
  registerStrokeCategory,
  strokeCategoryIds,
  unregisterStrokeCategory,
} from "./strokeCategory.js";
import { initialSquatDepthState } from "./squatDepth.js";
import { strokeMark, STROKE_MARKS } from "./strokeMarks.js";
import type { Pose } from "./types.js";

describe("行程标注", () => {
  it("每个已接入动作都有自己的起始区和目标区", () => {
    const ids = EXERCISE_CATALOG.filter((entry) => entry.tier === "coachable").map(
      (entry) => entry.id,
    );
    for (const id of ids) {
      const mark = strokeMark(id);
      expect(mark?.start, id).toBeTruthy();
      expect(mark?.target, id).toBeTruthy();
    }
    expect(STROKE_MARKS).toHaveLength(ids.length);
    expect(usesAttempt("ohp")).toBe(true);
    expect(usesAttempt("plank")).toBe(false);
    expect(usesAttempt("side-plank")).toBe(false);
  });

  it("推、拉、举只是标签，分类只有身体部位", () => {
    const parts = new Set(STROKE_MARKS.map((mark) => mark.bodyPart));
    expect([...parts].sort()).toEqual(["arm", "hip", "leg", "trunk"]);
    expect(strokeMark("ohp")?.actionLabel).toBe("推");
    expect(strokeMark("ohp")?.bodyPart).toBe(strokeMark("bench-press")?.bodyPart);
  });

  it("推举用从站到卧的 180 度参数，手臂垂在身侧不是目标", () => {
    expect(strokeMark("ohp")?.orientationSpanDeg).toBe(180);
    const hanging = readAttemptRegion(
      "ohp",
      [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { x: 0.4, y: 0.3, wx: 0, wy: 0, wz: 0 },
        { x: 0.6, y: 0.3, wx: 0.2, wy: 0, wz: 0 },
        { x: 0.35, y: 0.55, wx: 0, wy: -0.3, wz: 0 },
        { x: 0.65, y: 0.55, wx: 0.2, wy: -0.3, wz: 0 },
        { x: 0.32, y: 0.8, wx: 0, wy: -0.6, wz: 0 },
        { x: 0.68, y: 0.8, wx: 0.2, wy: -0.6, wz: 0 },
      ] as Pose,
      initialSquatDepthState(),
    );
    expect(hanging.obs?.atFinish).toBe(false);
    expect(hanging.obs?.atStart).toBe(false);
  });

  it("新类别可以插进来", () => {
    registerStrokeCategory("grip", () => ({
      squat: initialSquatDepthState(),
      obs: { progress: 0, atStart: true, atFinish: false, shortTravel: 0.5 },
    }));
    expect(strokeCategoryIds()).toContain("grip");
    unregisterStrokeCategory("grip");
    expect(strokeCategoryIds()).not.toContain("grip");
  });
});
