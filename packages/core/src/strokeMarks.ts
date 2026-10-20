/**
 * 已接入动作的起始区 / 目标区。
 * 推、拉、举只是 actionLabel，不参与分类。
 * 计次文案在 countingRule.ts，不放在这里。
 */

import type { CoachableExerciseId } from "./exercises/catalog.js";
import { SQUAT_CLOSE, SQUAT_STILL_STANDING } from "./squatDepth.js";

/** 四类：按身体部位。 */
export type StrokeBodyPart = "arm" | "leg" | "hip" | "trunk";

export type StrokeZone =
  | { kind: "openness-min"; value: number }
  | { kind: "openness-max"; value: number }
  | { kind: "extension-min"; value: number }
  | { kind: "extension-max"; value: number }
  | { kind: "overhead-min"; value: number }
  | { kind: "lift-max"; value: number }
  | { kind: "shoulder-side" }
  | { kind: "deg-above"; deg: number }
  | { kind: "deg-below"; deg: number };

export interface StrokeMark {
  exerciseId: CoachableExerciseId;
  bodyPart: StrokeBodyPart;
  /** 推、拉、举等，只挂在动作上。 */
  actionLabel: string;
  /**
   * 类内参数。推举从站到卧的行程跨度接近 180 度，是四类里第一个用到的参数。
   */
  orientationSpanDeg?: number;
  start: StrokeZone;
  target: StrokeZone;
  /** 按秒的动作也有区域，但不交给行程引擎计次。 */
  countsRep: boolean;
  /**
   * 两侧都读得到时，两侧都要到达。只读到一侧时那一侧可以继续，不拦死。
   * 弓步这种工作腿不设。
   */
  bilateral?: boolean;
  /**
   * 手臂这一类的方向。折起比例只说明手臂弯了，不能单独当到达。
   * 类内参数，不是新的分类。
   */
  armPlane?: ArmPlane;
}

/** 推、拉、举、向两侧打开。挂在手臂这一类上。 */
export type ArmPlane =
  | "fold"
  | "pull-down"
  | "pull-back"
  | "pull-up"
  | "to-face"
  | "open-side"
  | "raise-front"
  | "raise-side";

const ARM_FOLD_START: StrokeZone = { kind: "extension-min", value: 0.9 };
const ARM_FOLD_TARGET: StrokeZone = { kind: "extension-max", value: 0.62 };

function armFold(
  exerciseId: CoachableExerciseId,
  actionLabel: string,
  armPlane: ArmPlane,
): StrokeMark {
  return {
    exerciseId,
    bodyPart: "arm",
    actionLabel,
    start: ARM_FOLD_START,
    target: ARM_FOLD_TARGET,
    countsRep: true,
    bilateral: true,
    armPlane,
  };
}

/** 拉类完成看工作肘角，不再用肩到腕的折起比例。度数与各自规则一致。 */
function elbowPull(
  exerciseId: CoachableExerciseId,
  actionLabel: string,
  armPlane: "pull-down" | "pull-back" | "pull-up" | "to-face",
  startDeg: number,
  targetDeg: number,
): StrokeMark {
  return {
    exerciseId,
    bodyPart: "arm",
    actionLabel,
    start: { kind: "deg-above", deg: startDeg },
    target: { kind: "deg-below", deg: targetDeg },
    countsRep: true,
    armPlane,
  };
}

function drive(
  exerciseId: CoachableExerciseId,
  bodyPart: StrokeBodyPart,
  actionLabel: string,
  startAbove: number,
  targetBelow: number,
  countsRep: boolean,
): StrokeMark {
  return {
    exerciseId,
    bodyPart,
    actionLabel,
    start: { kind: "deg-above", deg: startAbove },
    target: { kind: "deg-below", deg: targetBelow },
    countsRep,
  };
}

export const STROKE_MARKS: readonly StrokeMark[] = [
  {
    exerciseId: "squat",
    bodyPart: "leg",
    actionLabel: "蹲",
    start: { kind: "openness-min", value: SQUAT_STILL_STANDING },
    target: { kind: "openness-max", value: SQUAT_CLOSE },
    countsRep: true,
  },
  {
    exerciseId: "goblet-squat",
    bodyPart: "leg",
    actionLabel: "蹲",
    start: { kind: "openness-min", value: SQUAT_STILL_STANDING },
    target: { kind: "openness-max", value: SQUAT_CLOSE },
    countsRep: true,
  },
  drive("lunge", "leg", "弓步", 150, 100, true),
  { ...drive("leg-press", "leg", "推", 155, 105, true), bilateral: true },
  drive("calf-raise", "leg", "提踵", 85, 60, true),
  drive("rdl", "hip", "铰链", 155, 115, true),
  drive("glute-bridge", "hip", "铰链", 48, 40, true),
  armFold("bench-press", "推", "fold"),
  armFold("pushup", "推", "fold"),
  armFold("dip", "推", "fold"),
  armFold("incline-pushup", "推", "fold"),
  armFold("pike-pushup", "推", "fold"),
  armFold("chest-press-machine", "推", "fold"),
  {
    exerciseId: "ohp",
    bodyPart: "arm",
    actionLabel: "推",
    orientationSpanDeg: 180,
    start: { kind: "extension-max", value: 0.78 },
    target: { kind: "overhead-min", value: 0.9 },
    countsRep: true,
    bilateral: true,
    armPlane: "fold",
  },
  elbowPull("lat-pulldown", "拉", "pull-down", 145, 105),
  elbowPull("seated-row", "拉", "pull-back", 130, 95),
  elbowPull("db-row", "拉", "pull-back", 125, 95),
  elbowPull("band-row", "拉", "pull-back", 130, 100),
  elbowPull("pullup", "拉", "pull-up", 150, 100),
  elbowPull("face-pull", "拉", "to-face", 130, 100),
  {
    exerciseId: "lateral-raise",
    bodyPart: "arm",
    actionLabel: "举",
    start: { kind: "lift-max", value: 0.25 },
    target: { kind: "shoulder-side" },
    countsRep: true,
    bilateral: true,
    armPlane: "raise-side",
  },
  { ...drive("front-raise", "arm", "举", 155, 115, true), bilateral: true, armPlane: "raise-front" },
  { ...drive("rear-delt-fly", "arm", "举", 155, 125, true), bilateral: true, armPlane: "open-side" },
  { ...drive("db-fly", "arm", "打开", 155, 145, true), bilateral: true, armPlane: "open-side" },
  { ...drive("cable-crossover", "arm", "打开", 120, 80, true), bilateral: true, armPlane: "open-side" },
  drive("superman", "trunk", "伸", 168, 152, true),
  drive("dead-bug", "trunk", "伸", 70, 35, true),
  drive("bird-dog", "trunk", "伸", 65, 40, true),
  drive("crunch", "trunk", "卷", 165, 148, true),
  drive("hanging-knee-raise", "trunk", "举", 155, 105, true),
  drive("plank", "trunk", "撑", 32, 22, false),
  drive("side-plank", "trunk", "撑", 35, 22, false),
];

const BY_ID = new Map(STROKE_MARKS.map((mark) => [mark.exerciseId, mark]));

export function strokeMark(exerciseId: string): StrokeMark | null {
  return BY_ID.get(exerciseId as CoachableExerciseId) ?? null;
}

export function repStrokeIds(): string[] {
  return STROKE_MARKS.filter((mark) => mark.countsRep).map((mark) => mark.exerciseId);
}
