import { describe, expect, it } from "vitest";
import {
  addSet,
  addSlot,
  applyFollowAlongSet,
  applyWorkoutTemplate,
  calendarDayLabel,
  calendarDayLocal,
  calendarDayUtc,
  calendarMonthDays,
  shiftYearMonth,
  copyLastSet,
  copySet,
  countModeForRef,
  backdateKind,
  createBackdatedWorkout,
  createWorkout,
  dayVolumeKg,
  formatVolumeKg,
  formatWeightAmount,
  kgToLb,
  lbToKg,
  openWorkout,
  parseWeightToKg,
  recordedWeightUnit,
  retargetWeightText,
  toggleWeightUnit,
  effectiveBodyweightKg,
  emptyWorkoutLog,
  endWorkout,
  endedWorkouts,
  ensureOpenWorkout,
  homeDayWorkouts,
  homeSessionWorkout,
  lastLoadForExercise,
  listWorkoutTemplates,
  personalRecords,
  prStampMark,
  prStampParts,
  visiblePersonalRecords,
  loadWorkoutLogFromMemory,
  parseWorkoutLog,
  patchSet,
  patchWorkout,
  removeSet,
  removeSlot,
  removeWorkout,
  restDurationForRemaining,
  restRemainingFromSandFraction,
  restRemainingSec,
  restSandCapacitySec,
  saveWorkoutAsTemplate,
  saveWorkoutLogToMemory,
  setBodyweightKg,
  stringifyWorkoutLog,
  suggestedWeightKg,
  trainedCalendarDays,
  workoutsOnCalendarDay,
  workoutExerciseSummary,
  workoutTitleDisplay,
  workoutVolumeKg,
  type WorkoutLogIds,
} from "./index.js";

function ids(): WorkoutLogIds {
  let n = 0;
  return { nextId: () => `id-${++n}` };
}

describe("FR-091 多动作课", () => {
  it("一节课可挂深蹲与卧推并各记组", () => {
    const clock = ids();
    let log = emptyWorkoutLog();
    const created = createWorkout(log, "2026-09-10T01:00:00.000Z", clock);
    log = created.log;
    const squat = addSlot(
      log,
      created.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    );
    log = squat.log;
    const bench = addSlot(
      log,
      created.workoutId,
      { kind: "catalog", catalogId: "bench-press" },
      clock,
    );
    log = bench.log;
    log = addSet(
      log,
      created.workoutId,
      squat.slotId,
      { reps: 8, weightKg: 60 },
      clock,
    ).log;
    log = addSet(
      log,
      created.workoutId,
      bench.slotId,
      { reps: 10, weightKg: 40 },
      clock,
    ).log;
    const workout = log.workouts[0]!;
    expect(workout.slots).toHaveLength(2);
    expect(workoutVolumeKg(workout)).toBe(8 * 60 + 10 * 40);
  });

  it("自定义名称可记、空名拒绝", () => {
    const clock = ids();
    let log = emptyWorkoutLog();
    const created = createWorkout(log, "2026-09-10T01:00:00.000Z", clock);
    log = created.log;
    expect(() =>
      addSlot(
        log,
        created.workoutId,
        { kind: "custom", name: "  " },
        clock,
      ),
    ).toThrow(/name/);
    const custom = addSlot(
      log,
      created.workoutId,
      { kind: "custom", name: " 史密斯深蹲 " },
      clock,
    );
    expect(custom.log.workouts[0]!.slots[0]!.exercise).toEqual({
      kind: "custom",
      name: "史密斯深蹲",
    });
  });
});

describe("FR-094 容量", () => {
  it("未填重量的组容量为 0", () => {
    expect(
      workoutVolumeKg({
        id: "w",
        startedAt: "2026-09-10T00:00:00.000Z",
        status: "open",
        slots: [
          {
            id: "s",
            exercise: { kind: "catalog", catalogId: "squat" },
            countMode: "reps",
            sets: [{ id: "a", kind: "reps", reps: 10 }],
          },
        ],
      }),
    ).toBe(0);
  });

  it("平板计时即使填了公斤也不进容量", () => {
    expect(countModeForRef({ kind: "catalog", catalogId: "plank" })).toBe(
      "timed",
    );
    const clock = ids();
    let log = emptyWorkoutLog();
    const created = createWorkout(log, "2026-09-10T02:00:00.000Z", clock);
    log = created.log;
    const slot = addSlot(
      log,
      created.workoutId,
      { kind: "catalog", catalogId: "plank" },
      clock,
    );
    log = addSet(
      slot.log,
      created.workoutId,
      slot.slotId,
      { durationSec: 45, weightKg: 20, reps: 45 },
      clock,
    ).log;
    expect(workoutVolumeKg(log.workouts[0]!)).toBe(0);
  });

  it("按日加总只含当天课", () => {
    const clock = ids();
    let log = emptyWorkoutLog();
    const d1 = createWorkout(log, "2026-09-09T23:00:00.000Z", clock);
    log = d1.log;
    const s1 = addSlot(
      log,
      d1.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    );
    log = addSet(
      s1.log,
      d1.workoutId,
      s1.slotId,
      { reps: 5, weightKg: 10 },
      clock,
    ).log;
    const d2 = createWorkout(log, "2026-09-10T01:00:00.000Z", clock);
    log = d2.log;
    const s2 = addSlot(
      log,
      d2.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    );
    log = addSet(
      s2.log,
      d2.workoutId,
      s2.slotId,
      { reps: 5, weightKg: 20 },
      clock,
    ).log;
    expect(calendarDayUtc("2026-09-10T01:00:00.000Z")).toBe("2026-09-10");
    expect(dayVolumeKg(log, "2026-09-10")).toBe(100);
    expect(dayVolumeKg(log, "2026-09-09")).toBe(50);
  });
});

describe("FR-095 上次重量", () => {
  it("同动作带出最近一次 kg 与次数", () => {
    const clock = ids();
    let log = emptyWorkoutLog();
    const w1 = createWorkout(log, "2026-09-08T01:00:00.000Z", clock);
    log = w1.log;
    const slot1 = addSlot(
      log,
      w1.workoutId,
      { kind: "catalog", catalogId: "rdl" },
      clock,
    );
    log = addSet(
      slot1.log,
      w1.workoutId,
      slot1.slotId,
      { reps: 8, weightKg: 50 },
      clock,
    ).log;
    log = endWorkout(log, w1.workoutId, "2026-09-08T02:00:00.000Z");
    const w2 = createWorkout(log, "2026-09-10T01:00:00.000Z", clock);
    log = w2.log;
    const slot2 = addSlot(
      log,
      w2.workoutId,
      { kind: "catalog", catalogId: "rdl" },
      clock,
    );
    log = addSet(
      slot2.log,
      w2.workoutId,
      slot2.slotId,
      { reps: 6, weightKg: 55 },
      clock,
    ).log;
    expect(
      lastLoadForExercise(log, { kind: "catalog", catalogId: "rdl" }),
    ).toEqual({ weightKg: 55, reps: 6 });
    expect(
      suggestedWeightKg(log, { kind: "catalog", catalogId: "rdl" }),
    ).toBe(55);
    expect(
      lastLoadForExercise(log, { kind: "catalog", catalogId: "squat" }),
    ).toBeNull();
    expect(
      suggestedWeightKg(log, { kind: "catalog", catalogId: "squat" }),
    ).toBeUndefined();
  });
});

describe("FR-093 跟练落组函数", () => {
  it("无进行中的课则新建，次数可改，可挂形态摘要", () => {
    const clock = ids();
    const log = applyFollowAlongSet(
      emptyWorkoutLog(),
      {
        catalogId: "squat",
        cameraReps: 12,
        reps: 10,
        weightKg: 40,
        formSummary: "膝内扣 2",
      },
      "2026-09-10T03:00:00.000Z",
      clock,
    );
    const set = log.workouts[0]!.slots[0]!.sets[0]!;
    expect(set.cameraReps).toBe(12);
    expect(set.reps).toBe(10);
    expect(set.weightKg).toBe(40);
    expect(set.formSummary).toBe("膝内扣 2");
    expect(workoutVolumeKg(log.workouts[0]!)).toBe(400);
  });

  it("指定 workoutId 时写入该课，不写入另一节进行中的课", () => {
    const clock = ids();
    const first = createWorkout(
      emptyWorkoutLog(),
      "2026-09-16T01:00:00.000Z",
      clock,
    );
    const second = createWorkout(
      first.log,
      "2026-09-16T02:00:00.000Z",
      clock,
    );
    const log = applyFollowAlongSet(
      second.log,
      { catalogId: "squat", cameraReps: 6, reps: 5, weightKg: 20 },
      "2026-09-16T03:00:00.000Z",
      clock,
      first.workoutId,
    );
    const older = log.workouts.find((w) => w.id === first.workoutId)!;
    const newer = log.workouts.find((w) => w.id === second.workoutId)!;
    expect(older.slots[0]!.sets[0]!.reps).toBe(5);
    expect(newer.slots).toEqual([]);
  });

  it("不传 workoutId 时写入最后一节进行中的课", () => {
    const clock = ids();
    const first = createWorkout(
      emptyWorkoutLog(),
      "2026-09-16T01:00:00.000Z",
      clock,
    );
    const second = createWorkout(
      first.log,
      "2026-09-16T02:00:00.000Z",
      clock,
    );
    const log = applyFollowAlongSet(
      second.log,
      { catalogId: "squat", cameraReps: 4, weightKg: 10 },
      "2026-09-16T03:00:00.000Z",
      clock,
    );
    const older = log.workouts.find((w) => w.id === first.workoutId)!;
    const newer = log.workouts.find((w) => w.id === second.workoutId)!;
    expect(older.slots).toEqual([]);
    expect(newer.slots[0]!.sets[0]!.cameraReps).toBe(4);
  });

  it("指定不存在的课则抛错", () => {
    expect(() =>
      applyFollowAlongSet(
        emptyWorkoutLog(),
        { catalogId: "squat", cameraReps: 1 },
        "2026-09-16T03:00:00.000Z",
        ids(),
        "missing",
      ),
    ).toThrow(/workout not found/);
  });

  it("指定已结束的课仍写入该节", () => {
    const clock = ids();
    const created = createWorkout(
      emptyWorkoutLog(),
      "2026-09-16T01:00:00.000Z",
      clock,
    );
    const ended = endWorkout(
      created.log,
      created.workoutId,
      "2026-09-16T02:00:00.000Z",
    );
    const log = applyFollowAlongSet(
      ended,
      { catalogId: "chest-press-machine", cameraReps: 8, reps: 8, weightKg: 70 },
      "2026-09-16T03:00:00.000Z",
      clock,
      created.workoutId,
    );
    const workout = log.workouts.find((w) => w.id === created.workoutId)!;
    expect(workout.status).toBe("ended");
    expect(workout.slots[0]!.exercise).toEqual({
      kind: "catalog",
      catalogId: "chest-press-machine",
    });
    expect(workout.slots[0]!.sets[0]!.reps).toBe(8);
    expect(workout.slots[0]!.sets[0]!.weightKg).toBe(70);
  });

  it("patchSet 可改已落组的次数", () => {
    const clock = ids();
    let log = applyFollowAlongSet(
      emptyWorkoutLog(),
      { catalogId: "squat", cameraReps: 8, weightKg: 20 },
      "2026-09-10T03:00:00.000Z",
      clock,
    );
    const workout = log.workouts[0]!;
    const slot = workout.slots[0]!;
    const set = slot.sets[0]!;
    log = patchSet(log, workout.id, slot.id, set.id, { reps: 7 });
    expect(log.workouts[0]!.slots[0]!.sets[0]!.reps).toBe(7);
    expect(workoutVolumeKg(log.workouts[0]!)).toBe(140);
  });
});

describe("FR-073 序列化往返", () => {
  it("写入内存字符串再读出字段一致", () => {
    const clock = ids();
    let log = emptyWorkoutLog();
    const created = createWorkout(log, "2026-09-10T04:00:00.000Z", clock);
    log = created.log;
    const slot = addSlot(
      log,
      created.workoutId,
      { kind: "catalog", catalogId: "ohp" },
      clock,
    );
    log = addSet(
      slot.log,
      created.workoutId,
      slot.slotId,
      { reps: 5, weightKg: 30, restSec: 90, note: "顶住" },
      clock,
    ).log;
    log = endWorkout(log, created.workoutId, "2026-09-10T05:00:00.000Z");
    const box = { raw: null as string | null };
    saveWorkoutLogToMemory(box, log);
    const loaded = loadWorkoutLogFromMemory(box);
    expect(loaded).toEqual(log);
    expect(parseWorkoutLog(stringifyWorkoutLog(log))).toEqual(log);
  });

  it("空存储读出空课表；坏版本拒绝", () => {
    expect(loadWorkoutLogFromMemory({ raw: null })).toEqual(emptyWorkoutLog());
    expect(() =>
      parseWorkoutLog(JSON.stringify({ version: 99, workouts: [] })),
    ).toThrow(/version/);
  });
});

describe("ensureOpenWorkout + FR-096 剩余秒", () => {
  it("没有进行中的课则新建，有则复用", () => {
    const clock = ids();
    const first = ensureOpenWorkout(
      emptyWorkoutLog(),
      "2026-09-10T06:00:00.000Z",
      clock,
    );
    const again = ensureOpenWorkout(
      first.log,
      "2026-09-10T07:00:00.000Z",
      clock,
    );
    expect(again.workoutId).toBe(first.workoutId);
    expect(again.log.workouts).toHaveLength(1);
  });

  it("restRemainingSec 按墙钟递减到 0", () => {
    expect(restRemainingSec(90, 1_000, 1_000)).toBe(90);
    expect(restRemainingSec(90, 1_000, 1_000 + 30_000)).toBe(60);
    expect(restRemainingSec(90, 1_000, 1_000 + 90_000)).toBe(0);
    expect(restRemainingSec(90, 1_000, 1_000 + 120_000)).toBe(0);
  });

  it("拖沙漏改剩余秒，墙钟起点不变", () => {
    expect(restSandCapacitySec(90)).toBe(300);
    expect(restRemainingFromSandFraction(0, 90)).toBe(300);
    expect(restRemainingFromSandFraction(1, 90)).toBe(0);
    expect(restRemainingFromSandFraction(0.5, 90)).toBe(150);
    const started = 10_000;
    const now = started + 30_000;
    expect(restDurationForRemaining(started, now, 120)).toBe(150);
    expect(restRemainingSec(150, started, now)).toBe(120);
  });
});

describe("T12-R 改删复制、自重、结束后回看", () => {
  it("patch / removeSet / copyLastSet", () => {
    const clock = ids();
    let log = emptyWorkoutLog();
    const created = createWorkout(log, "2026-09-10T08:00:00.000Z", clock);
    log = created.log;
    const slot = addSlot(
      log,
      created.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    );
    log = addSet(
      slot.log,
      created.workoutId,
      slot.slotId,
      { reps: 5, weightKg: 60 },
      clock,
    ).log;
    log = addSet(
      log,
      created.workoutId,
      slot.slotId,
      { reps: 5, weightKg: 62.5 },
      clock,
    ).log;
    const firstId = log.workouts[0]!.slots[0]!.sets[0]!.id;
    log = patchSet(log, created.workoutId, slot.slotId, firstId, { reps: 6 });
    expect(log.workouts[0]!.slots[0]!.sets[0]!.reps).toBe(6);
    log = copyLastSet(log, created.workoutId, slot.slotId, clock).log;
    expect(log.workouts[0]!.slots[0]!.sets).toHaveLength(3);
    expect(log.workouts[0]!.slots[0]!.sets[2]!.weightKg).toBe(62.5);
    log = removeSet(log, created.workoutId, slot.slotId, firstId);
    expect(log.workouts[0]!.slots[0]!.sets).toHaveLength(2);
    log = removeSlot(log, created.workoutId, slot.slotId);
    expect(log.workouts[0]!.slots).toHaveLength(0);
  });

  it("结束课后 homeSessionWorkout 仍指向该课", () => {
    const clock = ids();
    const created = createWorkout(
      emptyWorkoutLog(),
      "2026-09-10T08:00:00.000Z",
      clock,
    );
    const ended = endWorkout(
      created.log,
      created.workoutId,
      "2026-09-10T09:00:00.000Z",
    );
    const shown = homeSessionWorkout(ended);
    expect(shown?.id).toBe(created.workoutId);
    expect(shown?.status).toBe("ended");
  });

  it("自重写入组重量；容量仍按填入的 kg", () => {
    const clock = ids();
    let log = setBodyweightKg(emptyWorkoutLog(), 70);
    expect(
      suggestedWeightKg(log, { kind: "catalog", catalogId: "pushup" }),
    ).toBeUndefined();
    const created = createWorkout(log, "2026-09-10T08:00:00.000Z", clock);
    log = created.log;
    const slot = addSlot(
      log,
      created.workoutId,
      { kind: "catalog", catalogId: "pushup" },
      clock,
    );
    log = addSet(
      slot.log,
      created.workoutId,
      slot.slotId,
      { reps: 10, weightKg: log.bodyweightKg },
      clock,
    ).log;
    expect(workoutVolumeKg(log.workouts[0]!)).toBe(700);
    const round = parseWorkoutLog(stringifyWorkoutLog(log));
    expect(round.bodyweightKg).toBe(70);
  });
});

describe("T12-R2 主题、记录列表、本节自重、复制指定组", () => {
  it("patchWorkout 主题；结束课后 endedWorkouts 含该课", () => {
    const clock = ids();
    const created = createWorkout(
      emptyWorkoutLog(),
      "2026-09-10T10:00:00.000Z",
      clock,
    );
    let log = patchWorkout(created.log, created.workoutId, { title: "推日" });
    expect(workoutTitleDisplay(log.workouts[0]!)).toBe("推日");
    const slot = addSlot(
      log,
      created.workoutId,
      { kind: "catalog", catalogId: "pushup" },
      clock,
    );
    log = addSet(
      slot.log,
      created.workoutId,
      slot.slotId,
      { reps: 8, weightKg: 70 },
      clock,
    ).log;
    expect(workoutExerciseSummary(log.workouts[0]!)).toMatch(/俯卧撑/);
    log = endWorkout(log, created.workoutId, "2026-09-10T11:00:00.000Z");
    expect(endedWorkouts(log).map((w) => w.id)).toEqual([created.workoutId]);
  });

  it("本节自重覆盖档案自重；copySet 复制指定组", () => {
    const clock = ids();
    let log = setBodyweightKg(emptyWorkoutLog(), 70);
    const created = createWorkout(log, "2026-09-10T10:00:00.000Z", clock);
    log = patchWorkout(created.log, created.workoutId, { bodyweightKg: 75 });
    const workout = log.workouts[0]!;
    expect(
      suggestedWeightKg(log, { kind: "catalog", catalogId: "pushup" }, workout),
    ).toBeUndefined();
    expect(effectiveBodyweightKg(log, workout)).toBe(75);
    const slot = addSlot(
      log,
      created.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    );
    log = addSet(
      slot.log,
      created.workoutId,
      slot.slotId,
      { reps: 5, weightKg: 60 },
      clock,
    ).log;
    log = addSet(
      log,
      created.workoutId,
      slot.slotId,
      { reps: 3, weightKg: 80 },
      clock,
    ).log;
    const firstId = log.workouts[0]!.slots[0]!.sets[0]!.id;
    log = copySet(log, created.workoutId, slot.slotId, firstId, clock).log;
    const sets = log.workouts[0]!.slots[0]!.sets;
    expect(sets).toHaveLength(3);
    expect(sets[2]!.reps).toBe(5);
    expect(sets[2]!.weightKg).toBe(60);
  });
});

describe("T12-R3 结束可改、本地日、主题落库", () => {
  it("结束课后仍可改主题并加组，endedWorkouts 读到同一课", () => {
    const clock = ids();
    const created = createWorkout(
      emptyWorkoutLog(),
      "2026-09-10T10:00:00.000Z",
      clock,
    );
    let log = addSlot(
      created.log,
      created.workoutId,
      { kind: "catalog", catalogId: "pushup" },
      clock,
    ).log;
    log = endWorkout(log, created.workoutId, "2026-09-10T11:00:00.000Z");
    log = patchWorkout(log, created.workoutId, { title: "PushDay" });
    const slotId = log.workouts[0]!.slots[0]!.id;
    log = addSet(
      log,
      created.workoutId,
      slotId,
      { reps: 8, weightKg: 40 },
      clock,
    ).log;
    const listed = endedWorkouts(log)[0]!;
    expect(listed.title).toBe("PushDay");
    expect(listed.slots[0]!.sets).toHaveLength(1);
    expect(listed.slots[0]!.sets[0]!.reps).toBe(8);
  });

  it("homeSessionWorkout 可按 id 打开已结束的课", () => {
    const clock = ids();
    const first = createWorkout(
      emptyWorkoutLog(),
      "2026-09-10T10:00:00.000Z",
      clock,
    );
    let log = endWorkout(
      first.log,
      first.workoutId,
      "2026-09-10T11:00:00.000Z",
    );
    const second = createWorkout(log, "2026-09-11T08:00:00.000Z", clock);
    log = second.log;
    expect(homeSessionWorkout(log)?.id).toBe(second.workoutId);
    expect(homeSessionWorkout(log, first.workoutId)?.id).toBe(first.workoutId);
  });

  it("calendarDayLocal 按指定时区，不跟 UTC 切日", () => {
    const iso = "2026-09-10T18:29:00.000Z";
    expect(calendarDayUtc(iso)).toBe("2026-09-10");
    expect(calendarDayLocal(iso, "Asia/Shanghai")).toBe("2026-09-11");
    expect(calendarDayLabel(iso, "Asia/Shanghai")).toBe("9月11日");
  });
});

describe("T12-R4 上次重量不填自重、今日多课", () => {
  it("无该动作历史时 suggestedWeightKg 不回落自重", () => {
    const log = setBodyweightKg(emptyWorkoutLog(), 70);
    expect(
      suggestedWeightKg(log, { kind: "catalog", catalogId: "pushup" }),
    ).toBeUndefined();
    expect(
      suggestedWeightKg(log, { kind: "catalog", catalogId: "squat" }),
    ).toBeUndefined();
  });

  it("homeDayWorkouts 同一本地日两节都在；改一节不影响另一节", () => {
    const clock = ids();
    const tz = "Asia/Shanghai";
    const a = createWorkout(
      emptyWorkoutLog(),
      "2026-09-11T16:10:00.000Z",
      clock,
    );
    let log = patchWorkout(a.log, a.workoutId, { title: "晨练" });
    log = endWorkout(log, a.workoutId, "2026-09-12T01:00:00.000Z");
    const b = createWorkout(log, "2026-09-12T10:00:00.000Z", clock);
    log = patchWorkout(b.log, b.workoutId, { title: "夜练" });
    log = endWorkout(log, b.workoutId, "2026-09-12T11:00:00.000Z");
    const now = "2026-09-12T12:00:00.000Z";
    const day = homeDayWorkouts(log, now, tz);
    expect(day.map((w) => w.id)).toEqual([b.workoutId, a.workoutId]);
    log = patchWorkout(log, a.workoutId, { title: "晨练改" });
    const after = homeDayWorkouts(log, now, tz);
    expect(after).toHaveLength(2);
    expect(after.find((w) => w.id === a.workoutId)?.title).toBe("晨练改");
    expect(after.find((w) => w.id === b.workoutId)?.title).toBe("夜练");
    expect(endedWorkouts(log).map((w) => w.id)).toEqual([
      b.workoutId,
      a.workoutId,
    ]);
  });
});

describe("T13 FR-099 日历按本地日", () => {
  it("UTC 切日后上海仍算同一天；当天两节都列出", () => {
    const clock = ids();
    const tz = "Asia/Shanghai";
    const a = createWorkout(
      emptyWorkoutLog(),
      "2026-09-10T16:10:00.000Z",
      clock,
    );
    let log = endWorkout(a.log, a.workoutId, "2026-09-10T18:29:00.000Z");
    const b = createWorkout(log, "2026-09-11T02:00:00.000Z", clock);
    log = endWorkout(b.log, b.workoutId, "2026-09-11T03:00:00.000Z");
    expect(trainedCalendarDays(log, tz)).toEqual(["2026-09-11"]);
    expect(
      workoutsOnCalendarDay(log, "2026-09-11", tz).map((w) => w.id),
    ).toEqual([b.workoutId, a.workoutId]);
    expect(workoutsOnCalendarDay(log, "2026-09-10", tz)).toHaveLength(0);
  });

  it("月历格子周日为首；可翻月", () => {
    const cells = calendarMonthDays(2026, 9);
    expect(cells[0]).toBeNull();
    expect(cells[1]).toBeNull();
    expect(cells[2]).toBe("2026-09-01");
    expect(cells.filter((d) => d !== null)).toHaveLength(30);
    expect(shiftYearMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftYearMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });
});

describe("T14 FR-097 计划模板", () => {
  it("存模板再套用生成另一节课，组次重量可改且不改模板", () => {
    const clock = ids();
    const created = createWorkout(
      emptyWorkoutLog(),
      "2026-09-12T10:00:00.000Z",
      clock,
    );
    let log = patchWorkout(created.log, created.workoutId, { title: "胸日" });
    const slot = addSlot(
      log,
      created.workoutId,
      { kind: "catalog", catalogId: "pushup" },
      clock,
    );
    log = addSet(
      slot.log,
      created.workoutId,
      slot.slotId,
      { reps: 10, weightKg: 20 },
      clock,
    ).log;
    const saved = saveWorkoutAsTemplate(
      log,
      created.workoutId,
      "胸日",
      "2026-09-12T11:00:00.000Z",
      clock,
    );
    log = saved.log;
    expect(listWorkoutTemplates(log)).toHaveLength(1);
    const applied = applyWorkoutTemplate(
      log,
      saved.templateId,
      "2026-09-12T12:00:00.000Z",
      clock,
    );
    log = applied.log;
    expect(applied.workoutId).not.toBe(created.workoutId);
    const copy = log.workouts.find((w) => w.id === applied.workoutId)!;
    expect(copy.status).toBe("open");
    expect(copy.title).toBe("胸日");
    expect(copy.slots[0]!.sets[0]!.reps).toBe(10);
    expect(copy.slots[0]!.sets[0]!.weightKg).toBe(20);
    const setId = copy.slots[0]!.sets[0]!.id;
    log = patchSet(log, applied.workoutId, copy.slots[0]!.id, setId, {
      reps: 12,
    });
    expect(
      listWorkoutTemplates(log)[0]!.slots[0]!.sets[0]!.reps,
    ).toBe(10);
    const round = parseWorkoutLog(stringifyWorkoutLog(log));
    expect(round.templates).toHaveLength(1);
    expect(round.templates![0]!.name).toBe("胸日");
  });

  it("只能删已结束的课，模板仍在", () => {
    const clock = ids();
    const created = createWorkout(
      emptyWorkoutLog(),
      "2026-09-12T10:00:00.000Z",
      clock,
    );
    let log = addSlot(
      created.log,
      created.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    ).log;
    log = saveWorkoutAsTemplate(
      log,
      created.workoutId,
      "腿日",
      "2026-09-12T10:30:00.000Z",
      clock,
    ).log;
    expect(() => removeWorkout(log, created.workoutId)).toThrow(/ended/);
    log = endWorkout(log, created.workoutId, "2026-09-12T11:00:00.000Z");
    log = removeWorkout(log, created.workoutId);
    expect(log.workouts).toHaveLength(0);
    expect(listWorkoutTemplates(log)).toHaveLength(1);
  });
});

describe("FR-098 personalRecords", () => {
  it("takes the heaviest set and ignores unweighted or timed sets", () => {
    const clock = ids();
    const created = createWorkout(
      emptyWorkoutLog(),
      "2026-09-13T10:00:00.000Z",
      clock,
    );
    let log = created.log;
    const squat = addSlot(
      log,
      created.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    );
    log = addSet(
      squat.log,
      created.workoutId,
      squat.slotId,
      { reps: 8, weightKg: 40 },
      clock,
    ).log;
    log = addSet(
      log,
      created.workoutId,
      squat.slotId,
      { reps: 5, weightKg: 50 },
      clock,
    ).log;
    log = addSet(
      log,
      created.workoutId,
      squat.slotId,
      { reps: 10 },
      clock,
    ).log;
    const plank = addSlot(
      log,
      created.workoutId,
      { kind: "catalog", catalogId: "plank" },
      clock,
    );
    log = addSet(
      plank.log,
      created.workoutId,
      plank.slotId,
      { kind: "timed", durationSec: 40, weightKg: 20, reps: 40 },
      clock,
    ).log;
    const custom = addSlot(
      log,
      created.workoutId,
      { kind: "custom", name: "飞鸟" },
      clock,
    );
    log = addSet(
      custom.log,
      created.workoutId,
      custom.slotId,
      { reps: 12, weightKg: 12 },
      clock,
    ).log;
    expect(personalRecords(log)).toEqual([
      {
        exercise: { kind: "catalog", catalogId: "squat" },
        weightKg: 50,
        weightUnit: "kg",
        reps: 5,
        achievedAt: "2026-09-13T10:00:00.000Z",
      },
      {
        exercise: { kind: "custom", name: "飞鸟" },
        weightKg: 12,
        weightUnit: "kg",
        reps: 12,
        achievedAt: "2026-09-13T10:00:00.000Z",
      },
    ]);
  });

  it("same max weight keeps the higher-rep set", () => {
    const clock = ids();
    const created = createWorkout(
      emptyWorkoutLog(),
      "2026-09-13T11:00:00.000Z",
      clock,
    );
    const slot = addSlot(
      created.log,
      created.workoutId,
      { kind: "catalog", catalogId: "rdl" },
      clock,
    );
    let log = addSet(
      slot.log,
      created.workoutId,
      slot.slotId,
      { reps: 3, weightKg: 80 },
      clock,
    ).log;
    log = addSet(
      log,
      created.workoutId,
      slot.slotId,
      { reps: 5, weightKg: 80 },
      clock,
    ).log;
    expect(personalRecords(log)).toEqual([
      {
        exercise: { kind: "catalog", catalogId: "rdl" },
        weightKg: 80,
        weightUnit: "kg",
        reps: 5,
        achievedAt: "2026-09-13T11:00:00.000Z",
      },
    ]);
  });

  it("stamps the workout that first wrote the current PR", () => {
    const clock = ids();
    const first = createWorkout(
      emptyWorkoutLog(),
      "2026-09-01T02:00:00.000Z",
      clock,
    );
    const firstSlot = addSlot(
      first.log,
      first.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    );
    let log = addSet(
      firstSlot.log,
      first.workoutId,
      firstSlot.slotId,
      { reps: 5, weightKg: 50 },
      clock,
    ).log;
    const repeat = createWorkout(log, "2026-09-10T02:00:00.000Z", clock);
    const repeatSlot = addSlot(
      repeat.log,
      repeat.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    );
    log = addSet(
      repeatSlot.log,
      repeat.workoutId,
      repeatSlot.slotId,
      { reps: 5, weightKg: 50 },
      clock,
    ).log;
    const beaten = createWorkout(log, "2026-09-12T02:00:00.000Z", clock);
    const beatenSlot = addSlot(
      beaten.log,
      beaten.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    );
    log = addSet(
      beatenSlot.log,
      beaten.workoutId,
      beatenSlot.slotId,
      { reps: 3, weightKg: 60 },
      clock,
    ).log;
    expect(personalRecords(log)).toEqual([
      {
        exercise: { kind: "catalog", catalogId: "squat" },
        weightKg: 60,
        weightUnit: "kg",
        reps: 3,
        achievedAt: "2026-09-12T02:00:00.000Z",
      },
    ]);
  });

  it("keeps the earlier stamp when the same number is repeated", () => {
    const clock = ids();
    const later = createWorkout(
      emptyWorkoutLog(),
      "2026-09-10T02:00:00.000Z",
      clock,
    );
    const laterSlot = addSlot(
      later.log,
      later.workoutId,
      { kind: "catalog", catalogId: "ohp" },
      clock,
    );
    let log = addSet(
      laterSlot.log,
      later.workoutId,
      laterSlot.slotId,
      { reps: 5, weightKg: 40 },
      clock,
    ).log;
    const earlier = createWorkout(log, "2026-09-01T02:00:00.000Z", clock);
    const earlierSlot = addSlot(
      earlier.log,
      earlier.workoutId,
      { kind: "catalog", catalogId: "ohp" },
      clock,
    );
    log = addSet(
      earlierSlot.log,
      earlier.workoutId,
      earlierSlot.slotId,
      { reps: 5, weightKg: 40 },
      clock,
    ).log;
    expect(personalRecords(log)[0]?.achievedAt).toBe("2026-09-01T02:00:00.000Z");
  });

  it("preview keeps the heaviest four until expanded", () => {
    const clock = ids();
    let log = emptyWorkoutLog();
    const loads: Array<[string, number]> = [
      ["squat", 100],
      ["rdl", 90],
      ["ohp", 80],
      ["bench-press", 70],
      ["db-row", 60],
    ];
    for (const [catalogId, weightKg] of loads) {
      const created = createWorkout(
        log,
        "2026-09-13T10:00:00.000Z",
        clock,
      );
      const slot = addSlot(
        created.log,
        created.workoutId,
        { kind: "catalog", catalogId },
        clock,
      );
      log = addSet(
        slot.log,
        created.workoutId,
        slot.slotId,
        { reps: 5, weightKg },
        clock,
      ).log;
    }
    const rows = personalRecords(log);
    expect(rows.map((row) => row.weightKg)).toEqual([100, 90, 80, 70, 60]);
    expect(visiblePersonalRecords(rows, false).map((row) => row.weightKg)).toEqual([
      100, 90, 80, 70,
    ]);
    expect(visiblePersonalRecords(rows, true)).toHaveLength(5);
  });

  it("breaks the stamp into local year month day", () => {
    expect(prStampParts("2026-09-13T10:00:00.000Z", "Asia/Shanghai")).toEqual({
      year: 2026,
      month: 9,
      day: 13,
    });
    expect(prStampMark("2026-09-13T10:00:00.000Z", "Asia/Shanghai")).toEqual({
      monthDay: "09.13",
      year: "2026",
    });
  });
});

describe("T24 公斤/磅", () => {
  it("100 kg 显示约 220.5 lb，解析写回误差可接受", () => {
    expect(kgToLb(100)).toBeCloseTo(220.46226218, 5);
    expect(lbToKg(220.46226218)).toBeCloseTo(100, 5);
    expect(formatWeightAmount(100, "lb")).toBe("220.5");
    const written = parseWeightToKg("220.5", "lb");
    expect(written).toBeDefined();
    expect(Math.abs(written! - 100)).toBeLessThan(0.05);
    expect(formatWeightAmount(100, "kg")).toBe("100");
    expect(toggleWeightUnit("kg")).toBe("lb");
    expect(retargetWeightText("", "kg", "lb")).toBe("");
    expect(retargetWeightText("100", "kg", "lb")).toBe("220.5");
  });

  it("每一组记住输入单位，磁盘仍是公斤，旧数据缺省 kg", () => {
    const clock = ids();
    const created = createWorkout(
      setBodyweightKg(emptyWorkoutLog(), 70),
      "2026-09-18T02:00:00.000Z",
      clock,
    );
    const slotted = addSlot(
      created.log,
      created.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    );
    const kgStored = parseWeightToKg("220.5", "lb")!;
    const withSet = addSet(
      slotted.log,
      created.workoutId,
      slotted.slotId,
      { reps: 5, weightKg: kgStored, weightUnit: "lb" },
      clock,
    ).log;
    const round = parseWorkoutLog(stringifyWorkoutLog(withSet));
    const set = round.workouts[0]!.slots[0]!.sets[0]!;
    expect(set.weightUnit).toBe("lb");
    expect(set.weightKg).toBeCloseTo(100, 1);
    expect(round.bodyweightKg).toBe(70);
    expect("weightUnit" in round).toBe(false);
    expect(recordedWeightUnit(undefined)).toBe("kg");
  });

  it("容量内部仍是次数×公斤，不因这组用 lb 而改合计", () => {
    const clock = ids();
    const created = createWorkout(
      emptyWorkoutLog(),
      "2026-09-18T02:00:00.000Z",
      clock,
    );
    const slotted = addSlot(
      created.log,
      created.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    );
    const log = addSet(
      slotted.log,
      created.workoutId,
      slotted.slotId,
      { reps: 10, weightKg: 100, weightUnit: "lb" },
      clock,
    ).log;
    const workout = log.workouts[0]!;
    expect(workoutVolumeKg(workout)).toBe(1000);
    expect(formatVolumeKg(workoutVolumeKg(workout))).toBe("1000 kg");
  });

  it("PR 仍按存储公斤比大小，展示用该组记下的单位", () => {
    const clock = ids();
    let log = emptyWorkoutLog();
    const lighter = createWorkout(log, "2026-09-18T02:00:00.000Z", clock);
    log = lighter.log;
    const lightSlot = addSlot(
      log,
      lighter.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    );
    log = addSet(
      lightSlot.log,
      lighter.workoutId,
      lightSlot.slotId,
      { reps: 3, weightKg: 90, weightUnit: "kg" },
      clock,
    ).log;
    const heavier = createWorkout(log, "2026-09-18T03:00:00.000Z", clock);
    log = heavier.log;
    const heavySlot = addSlot(
      log,
      heavier.workoutId,
      { kind: "catalog", catalogId: "squat" },
      clock,
    );
    log = addSet(
      heavySlot.log,
      heavier.workoutId,
      heavySlot.slotId,
      { reps: 3, weightKg: 100, weightUnit: "lb" },
      clock,
    ).log;
    const rows = personalRecords(log);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.weightKg).toBe(100);
    expect(rows[0]!.weightUnit).toBe("lb");
    expect(formatWeightAmount(rows[0]!.weightKg, rows[0]!.weightUnit)).toBe("220.5");
  });
});

describe("T25 过去日补记", () => {
  const tz = "Asia/Shanghai";
  const now = "2026-09-10T16:30:00.000Z";

  it("上海昨天补记落在昨天且已结束，不是首页进行中", () => {
    expect(calendarDayLocal(now, tz)).toBe("2026-09-11");
    expect(backdateKind("2026-09-10", now, tz)).toBe("past");
    const clock = ids();
    const todayOpen = createWorkout(emptyWorkoutLog(), now, clock);
    const created = createBackdatedWorkout(
      todayOpen.log,
      "2026-09-10",
      now,
      clock,
      tz,
    );
    const workout = created.log.workouts.find((w) => w.id === created.workoutId)!;
    expect(workout.status).toBe("ended");
    expect(calendarDayLocal(workout.startedAt, tz)).toBe("2026-09-10");
    expect(calendarDayUtc(workout.startedAt)).not.toBe("2026-09-09");
    expect(trainedCalendarDays(created.log, tz)).toContain("2026-09-10");
    expect(workoutsOnCalendarDay(created.log, "2026-09-10", tz)).toHaveLength(1);
    expect(openWorkout(created.log)?.id).toBe(todayOpen.workoutId);
    const home = homeDayWorkouts(created.log, now, tz);
    expect(home.map((w) => w.id)).toEqual([todayOpen.workoutId]);
    expect(home.some((w) => w.id === created.workoutId)).toBe(false);
  });

  it("今天可以另开一节，不把昨天的进行中课当成今天", () => {
    const clock = ids();
    const yesterdayOpen = createWorkout(
      emptyWorkoutLog(),
      "2026-09-09T04:00:00.000Z",
      clock,
    );
    const created = createBackdatedWorkout(
      yesterdayOpen.log,
      "2026-09-11",
      now,
      clock,
      tz,
    );
    const workout = created.log.workouts.find((w) => w.id === created.workoutId)!;
    expect(created.workoutId).not.toBe(yesterdayOpen.workoutId);
    expect(workout.status).toBe("open");
    expect(calendarDayLocal(workout.startedAt, tz)).toBe("2026-09-11");
    expect(calendarDayLocal(yesterdayOpen.log.workouts[0]!.startedAt, tz)).toBe(
      "2026-09-09",
    );
  });

  it("未来日拒绝新建", () => {
    expect(backdateKind("2026-09-12", now, tz)).toBe("future");
    expect(() =>
      createBackdatedWorkout(emptyWorkoutLog(), "2026-09-12", now, ids(), tz),
    ).toThrow(/future/);
  });
});
