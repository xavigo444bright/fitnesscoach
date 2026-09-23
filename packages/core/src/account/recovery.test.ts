import { describe, expect, it } from "vitest";
import { emptyWorkoutLog, type Workout, type WorkoutLog } from "../workoutLog/types.js";
import {
  buildNameQuiz,
  buildRecoveryQuiz,
  catalogSetCountsInDays,
  pickNameDecoys,
  recoveryQuizMatches,
  toggleRecoveryPick,
} from "./recovery.js";

const NOW = "2026-09-18T12:00:00.000Z";
const CATALOG = [
  "squat",
  "bench-press",
  "deadlift",
  "row",
  "ohp",
  "lunge",
  "plank",
  "pushup",
  "dip",
  "pullup",
];

function logWith(workouts: Workout[]): WorkoutLog {
  return { ...emptyWorkoutLog(), workouts };
}

function ended(
  id: string,
  startedAt: string,
  slots: { catalogId: string; sets: number }[],
): Workout {
  return {
    id,
    startedAt,
    endedAt: startedAt,
    status: "ended",
    slots: slots.map((slot, index) => ({
      id: `${id}-${index}`,
      exercise: { kind: "catalog", catalogId: slot.catalogId },
      countMode: "reps",
      sets: Array.from({ length: slot.sets }, (_, n) => ({
        id: `${id}-${index}-${n}`,
        kind: "reps" as const,
        reps: 8,
      })),
    })),
  };
}

describe("7 天训练题", () => {
  it("只统计近 7 天的目录动作，自定义动作和更早的课不算", () => {
    const counts = catalogSetCountsInDays(
      logWith([
        ended("old", "2026-09-01T12:00:00.000Z", [{ catalogId: "deadlift", sets: 9 }]),
        ended("now", NOW, [
          { catalogId: "squat", sets: 4 },
          { catalogId: "bench-press", sets: 1 },
        ]),
        {
          ...ended("custom", NOW, []),
          slots: [
            {
              id: "c",
              exercise: { kind: "custom", name: "自创" },
              countMode: "reps",
              sets: [{ id: "cs", kind: "reps", reps: 10 }],
            },
          ],
        },
      ]),
      NOW,
      7,
      "UTC",
    );
    expect(counts).toEqual([
      { id: "squat", sets: 4 },
      { id: "bench-press", sets: 1 },
    ]);
  });

  it("练过几个就出几个，最多 3 个", () => {
    const one = buildRecoveryQuiz(
      [
        { id: "squat", sets: 4 },
      ],
      CATALOG,
      "user-a",
    );
    expect(one?.correctIds).toEqual(["squat"]);
    expect(one?.pickCount).toBe(1);
    expect(one?.choices).toHaveLength(6);

    const two = buildRecoveryQuiz(
      [
        { id: "squat", sets: 4 },
        { id: "bench-press", sets: 1 },
      ],
      CATALOG,
      "user-a",
    );
    expect(two?.correctIds).toEqual(["squat", "bench-press"]);
    expect(two?.pickCount).toBe(2);

    const three = buildRecoveryQuiz(
      [
        { id: "squat", sets: 4 },
        { id: "bench-press", sets: 3 },
        { id: "row", sets: 2 },
        { id: "ohp", sets: 1 },
      ],
      CATALOG,
      "user-a",
    );
    expect(three?.correctIds).toEqual(["squat", "bench-press", "row"]);
    expect(three?.pickCount).toBe(3);
    expect(three?.choices).toHaveLength(9);
  });

  it("没有可识别训练时不出题，答对必须正好是那一组", () => {
    expect(buildRecoveryQuiz([], CATALOG, "x")).toBeNull();
    expect(recoveryQuizMatches(["squat"], ["squat"])).toBe(true);
    expect(recoveryQuizMatches(["squat"], ["bench-press"])).toBe(false);
    expect(recoveryQuizMatches(["squat", "row"], ["squat"])).toBe(false);
  });

  it("训练题能连选多个，满了再点会顶掉最早的", () => {
    expect(toggleRecoveryPick([], "squat", 2)).toEqual(["squat"]);
    expect(toggleRecoveryPick(["squat"], "row", 2)).toEqual(["squat", "row"]);
    expect(toggleRecoveryPick(["squat", "row"], "ohp", 2)).toEqual(["row", "ohp"]);
    expect(toggleRecoveryPick(["squat", "row"], "squat", 2)).toEqual(["row"]);
  });

  it("账号题把本机名称混进后端抽到的用户名", () => {
    const quiz = buildNameQuiz("Ada", ["Bob", "Cara", "Ada"], "salt");
    expect(quiz?.correct).toBe("Ada");
    expect(quiz?.choices).toContain("Ada");
    expect(quiz?.choices).toContain("Bob");
    expect(pickNameDecoys(["Ada", "Bob", "Cara"], ["Ada"], 2, "s")).toEqual(
      expect.arrayContaining(["Bob", "Cara"]),
    );
  });
});
