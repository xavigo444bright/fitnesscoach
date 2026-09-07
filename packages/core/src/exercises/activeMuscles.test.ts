import { describe, expect, it } from "vitest";
import {
  activeMusclesForExercise,
  EXERCISE_CATALOG,
  isCoachableId,
  overlayKeepsBothArmsOnSide,
} from "./catalog.js";
import { activeMusclesFromBodyPart } from "./activeMuscles.js";

describe("activeMusclesForExercise (FR-085)", () => {
  it("reads explicit coachable registrations", () => {
    expect([...activeMusclesForExercise("squat")].sort()).toEqual([
      "pelvis",
      "thigh",
    ]);
    expect([...activeMusclesForExercise("pushup")].sort()).toEqual([
      "chest",
      "upperArm",
    ]);
    expect([...activeMusclesForExercise("glute-bridge")].sort()).toEqual([
      "pelvis",
      "thigh",
    ]);
    expect([...activeMusclesForExercise("lunge")].sort()).toEqual([
      "pelvis",
      "thigh",
    ]);
    expect([...activeMusclesForExercise("plank")].sort()).toEqual(["pelvis"]);
    expect([...activeMusclesForExercise("db-row")].sort()).toEqual([
      "chest",
      "upperArm",
    ]);
    expect([...activeMusclesForExercise("ohp")].sort()).toEqual(["upperArm"]);
    expect([...activeMusclesForExercise("bench-press")].sort()).toEqual([
      "chest",
      "upperArm",
    ]);
    expect([...activeMusclesForExercise("rdl")].sort()).toEqual([
      "pelvis",
      "thigh",
    ]);
    expect([...activeMusclesForExercise("pullup")].sort()).toEqual([
      "chest",
      "upperArm",
    ]);
    expect([...activeMusclesForExercise("db-fly")].sort()).toEqual([
      "chest",
      "upperArm",
    ]);
    expect([...activeMusclesForExercise("dip")].sort()).toEqual([
      "chest",
      "upperArm",
    ]);
    expect([...activeMusclesForExercise("incline-pushup")].sort()).toEqual([
      "chest",
      "upperArm",
    ]);
    expect([...activeMusclesForExercise("cable-crossover")].sort()).toEqual([
      "chest",
      "upperArm",
    ]);
    expect([...activeMusclesForExercise("chest-press-machine")].sort()).toEqual([
      "chest",
      "upperArm",
    ]);
    expect([...activeMusclesForExercise("lateral-raise")].sort()).toEqual([
      "upperArm",
    ]);
    expect([...activeMusclesForExercise("front-raise")].sort()).toEqual([
      "upperArm",
    ]);
    expect([...activeMusclesForExercise("rear-delt-fly")].sort()).toEqual([
      "upperArm",
    ]);
    expect([...activeMusclesForExercise("face-pull")].sort()).toEqual([
      "upperArm",
    ]);
    expect([...activeMusclesForExercise("pike-pushup")].sort()).toEqual([
      "upperArm",
    ]);
  });

  it("requires every coachable exercise to register activeMuscles", () => {
    const coachable = EXERCISE_CATALOG.filter((e) => e.tier === "coachable");
    expect(coachable.length).toBeGreaterThan(0);
    for (const e of coachable) {
      expect(
        e.activeMuscles && e.activeMuscles.length > 0,
        `${e.id} coachable 必须登记 activeMuscles`,
      ).toBeTruthy();
    }
  });

  it("falls back to bodyPart when catalog row has no list", () => {
    expect([...activeMusclesForExercise("goblet-squat")].sort()).toEqual(
      [...activeMusclesFromBodyPart("legs")].sort(),
    );
  });

  it("unknown id has no highlight", () => {
    expect(activeMusclesForExercise("not-an-exercise")).toEqual([]);
  });

  it("isCoachableId 与 catalog tier 对齐", () => {
    expect(isCoachableId("squat")).toBe(true);
    expect(isCoachableId("pushup")).toBe(true);
    expect(isCoachableId("glute-bridge")).toBe(true);
    expect(isCoachableId("lunge")).toBe(true);
    expect(isCoachableId("plank")).toBe(true);
    expect(isCoachableId("db-row")).toBe(true);
    expect(isCoachableId("ohp")).toBe(true);
    expect(isCoachableId("bench-press")).toBe(true);
    expect(isCoachableId("rdl")).toBe(true);
    expect(isCoachableId("pullup")).toBe(true);
    expect(isCoachableId("db-fly")).toBe(true);
    expect(isCoachableId("dip")).toBe(true);
    expect(isCoachableId("incline-pushup")).toBe(true);
    expect(isCoachableId("cable-crossover")).toBe(true);
    expect(isCoachableId("chest-press-machine")).toBe(true);
    expect(isCoachableId("lateral-raise")).toBe(true);
    expect(isCoachableId("front-raise")).toBe(true);
    expect(isCoachableId("rear-delt-fly")).toBe(true);
    expect(isCoachableId("face-pull")).toBe(true);
    expect(isCoachableId("pike-pushup")).toBe(true);
    expect(isCoachableId("goblet-squat")).toBe(false);
  });

  it("overlayKeepsBothArmsOnSide：卧推类侧面留两臂", () => {
    expect(overlayKeepsBothArmsOnSide("bench-press")).toBe(true);
    expect(overlayKeepsBothArmsOnSide("chest-press-machine")).toBe(true);
    expect(overlayKeepsBothArmsOnSide("squat")).toBe(false);
    expect(overlayKeepsBothArmsOnSide("rdl")).toBe(false);
  });
});
