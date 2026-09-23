import { describe, expect, it } from "vitest";
import { EXERCISE_CATALOG, type Equipment } from "./catalog.js";
import {
  DEFAULT_EXERCISE_ICON_KEY,
  EXERCISE_ICON_SLUG,
  catalogExerciseIconKeys,
  exerciseIconKey,
} from "./exerciseIcons.js";

describe("exerciseIconKey (T20)", () => {
  it("maps every catalog id to a Workout Guide slug", () => {
    const keys = catalogExerciseIconKeys();
    expect(keys.length).toBe(EXERCISE_CATALOG.length);
    for (const id of keys) {
      expect(EXERCISE_ICON_SLUG[id], `${id} 缺图标 slug`).toMatch(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      );
      expect(exerciseIconKey({ catalogId: id })).toBe(id);
    }
  });

  it("unknown catalog id without equipment uses squat", () => {
    expect(exerciseIconKey({ catalogId: "not-an-exercise" })).toBe(
      DEFAULT_EXERCISE_ICON_KEY,
    );
    expect(exerciseIconKey({})).toBe(DEFAULT_EXERCISE_ICON_KEY);
  });

  it("custom / unknown name follows equipment", () => {
    const byEq: Record<Equipment, string> = {
      bodyweight: "squat",
      dumbbell: "db-fly",
      barbell: "bench-press",
      machine: "chest-press-machine",
      band: "band-row",
      other: "squat",
    };
    for (const [equipment, key] of Object.entries(byEq) as Array<
      [Equipment, string]
    >) {
      expect(
        exerciseIconKey({ catalogId: "自制动作", equipment }),
      ).toBe(key);
    }
  });

  it("uses readable Workout Guide slugs for squat / push-up / pull-up", () => {
    expect(EXERCISE_ICON_SLUG.squat).toBe("squat");
    expect(EXERCISE_ICON_SLUG.pushup).toBe("push-up");
    expect(EXERCISE_ICON_SLUG.pullup).toBe("pull-up");
  });
});
