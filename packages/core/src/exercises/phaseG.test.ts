import { describe, expect, it } from "vitest";
import { buildGluteBridgePose } from "../fixtures/gluteBridge.js";
import { buildSquatPose } from "../fixtures/index.js";
import { buildPushupPose } from "../fixtures/pushup.js";
import {
  birdDogDeviationDeg,
  calfAnkleDeg,
  calfRaiseDriveDeg,
  crunchDriveDeg,
  deadBugDriveDeg,
  hangingKneeHipAngle,
  lumbarLiftDeg,
  lungeWorkingKneeAngle,
  plankBodyLineDeg,
  plankDriveDeg,
  dbRowWorkingElbowAngle,
  latPulldownWorkingElbowAngle,
  supermanDriveDeg,
} from "../phase.js";
import { countReps, messageForRepReject } from "../repCounter.js";
import { LandmarkIndex, type Landmark, type Pose } from "../types.js";
import {
  BAND_ROW_RULES,
  BIRD_DOG_RULES,
  CALF_RAISE_RULES,
  CRUNCH_RULES,
  DEAD_BUG_RULES,
  GOBLET_SQUAT_RULES,
  HANGING_KNEE_RAISE_RULES,
  LAT_PULLDOWN_RULES,
  LEG_PRESS_RULES,
  SEATED_ROW_RULES,
  SIDE_PLANK_RULES,
  SUPERMAN_RULES,
  validate,
} from "../validate.js";
import {
  BAND_ROW,
  BIRD_DOG,
  CALF_RAISE,
  CRUNCH,
  DEAD_BUG,
  GOBLET_SQUAT,
  HANGING_KNEE_RAISE,
  LAT_PULLDOWN,
  LEG_PRESS,
  SEATED_ROW,
  SIDE_PLANK,
  SUPERMAN,
} from "./phaseG.js";

const frames = (pose: Pose, n: number) => Array.from({ length: n }, () => pose);

function cycle(stand: Pose, mid: Pose, bottom: Pose): Pose[] {
  return [
    ...frames(stand, 6),
    ...frames(mid, 6),
    ...frames(bottom, 6),
    ...frames(mid, 6),
    ...frames(stand, 6),
  ];
}

const lm = (x: number, y: number): Landmark => ({ x, y, visibility: 1 });

/** 膝在上、踝在下，脚尖按踝角张开。 */
function calfPose(ankleDeg: number): Pose {
  const pose: Pose = [];
  const knee = { x: 0.5, y: 0.35 };
  const ankle = { x: 0.5, y: 0.62 };
  const rad = (ankleDeg * Math.PI) / 180;
  const foot = {
    x: ankle.x + 0.16 * Math.sin(rad),
    y: ankle.y - 0.16 * Math.cos(rad),
  };
  pose[LandmarkIndex.LeftKnee] = lm(knee.x, knee.y);
  pose[LandmarkIndex.RightKnee] = lm(knee.x, knee.y);
  pose[LandmarkIndex.LeftAnkle] = lm(ankle.x, ankle.y);
  pose[LandmarkIndex.RightAnkle] = lm(ankle.x, ankle.y);
  pose[LandmarkIndex.LeftFootIndex] = lm(foot.x, foot.y);
  pose[LandmarkIndex.RightFootIndex] = lm(foot.x, foot.y);
  return pose;
}

/** 髋为原点，肩（和膝）相对髋的仰角。y 向下。 */
function liftPose(elevationDeg: number): Pose {
  const pose: Pose = [];
  const hip = { x: 0.5, y: 0.55 };
  const rad = (elevationDeg * Math.PI) / 180;
  const point = {
    x: hip.x + 0.22 * Math.cos(rad),
    y: hip.y - 0.22 * Math.sin(rad),
  };
  pose[LandmarkIndex.LeftHip] = lm(hip.x, hip.y);
  pose[LandmarkIndex.RightHip] = lm(hip.x, hip.y);
  pose[LandmarkIndex.LeftShoulder] = lm(point.x, point.y);
  pose[LandmarkIndex.RightShoulder] = lm(point.x, point.y);
  pose[LandmarkIndex.LeftKnee] = lm(point.x, point.y);
  pose[LandmarkIndex.RightKnee] = lm(point.x, point.y);
  return pose;
}

describe("Phase G 接线", () => {
  it("高位下拉完整下拉计 1，半程不计", () => {
    const stand = buildPushupPose({ elbowDeg: 160 });
    const mid = buildPushupPose({ elbowDeg: 125 });
    const bottom = buildPushupPose({ elbowDeg: 80 });
    expect(latPulldownWorkingElbowAngle(stand)!).toBeGreaterThan(145);
    expect(latPulldownWorkingElbowAngle(bottom)!).toBeLessThan(105);
    const opts = {
      exerciseId: "lat-pulldown" as const,
      angleFn: latPulldownWorkingElbowAngle,
      phaseConfig: LAT_PULLDOWN.phaseThresholds,
      rules: LAT_PULLDOWN_RULES,
      depthRuleId: "pull-depth",
    };
    expect(countReps(cycle(stand, mid, bottom), opts).count).toBe(1);
    expect(
      countReps(
        [...frames(stand, 6), ...frames(mid, 12), ...frames(stand, 6)],
        opts,
      ).count,
    ).toBe(0);
    const fault = validate(mid, "bottom", LAT_PULLDOWN_RULES);
    expect(fault.results.find((r) => r.id === "pull-depth")?.triggered).toBe(
      true,
    );
    expect(messageForRepReject("shallow", "lat-pulldown")).toMatch(/拉得不够低/);
  });

  it("坐姿划船与弹力带划船进底计 1", () => {
    const stand = buildPushupPose({ elbowDeg: 155 });
    const mid = buildPushupPose({ elbowDeg: 115 });
    const seatedBottom = buildPushupPose({ elbowDeg: 70 });
    const bandBottom = buildPushupPose({ elbowDeg: 80 });
    expect(
      countReps(cycle(stand, mid, seatedBottom), {
        exerciseId: "seated-row",
        angleFn: dbRowWorkingElbowAngle,
        phaseConfig: SEATED_ROW.phaseThresholds,
        rules: SEATED_ROW_RULES,
        depthRuleId: "row-depth",
      }).count,
    ).toBe(1);
    expect(
      countReps(cycle(stand, mid, bandBottom), {
        exerciseId: "band-row",
        angleFn: dbRowWorkingElbowAngle,
        phaseConfig: BAND_ROW.phaseThresholds,
        rules: BAND_ROW_RULES,
        depthRuleId: "row-depth",
      }).count,
    ).toBe(1);
    expect(BAND_ROW.phaseThresholds.bottomBelowDeg).toBe(100);
    expect(SEATED_ROW.phaseThresholds.bottomBelowDeg).toBe(95);
  });

  it("腿举与高脚杯深蹲进底计 1；站立过前倾才报", () => {
    const stand = buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 20 });
    const mid = buildSquatPose({ kneeDeg: 130, torsoLeanDeg: 25 });
    const bottom = buildSquatPose({ kneeDeg: 85, torsoLeanDeg: 30 });
    expect(lungeWorkingKneeAngle(bottom)!).toBeLessThan(100);
    expect(
      countReps(cycle(stand, mid, bottom), {
        exerciseId: "leg-press",
        angleFn: lungeWorkingKneeAngle,
        phaseConfig: LEG_PRESS.phaseThresholds,
        rules: LEG_PRESS_RULES,
        depthRuleId: "knee-depth",
      }).count,
    ).toBe(1);
    expect(
      countReps(cycle(stand, mid, bottom), {
        exerciseId: "goblet-squat",
        angleFn: lungeWorkingKneeAngle,
        phaseConfig: GOBLET_SQUAT.phaseThresholds,
        rules: GOBLET_SQUAT_RULES,
        depthRuleId: "squat-depth",
      }).count,
    ).toBe(1);
    const lean = buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 70 });
    const res = validate(lean, "stand", GOBLET_SQUAT_RULES);
    expect(res.results.find((r) => r.id === "torso-lean")?.triggered).toBe(
      true,
    );
  });

  it("提踵驱动角随踝角升高而下降，并计 1", () => {
    const flat = calfPose(90);
    const raised = calfPose(140);
    expect(calfAnkleDeg(flat)!).toBeGreaterThan(80);
    expect(calfAnkleDeg(flat)!).toBeLessThan(100);
    expect(calfRaiseDriveDeg(flat)!).toBeGreaterThan(85);
    expect(calfRaiseDriveDeg(raised)!).toBeLessThan(60);
    const mid = calfPose(110);
    expect(
      countReps(cycle(flat, mid, raised), {
        exerciseId: "calf-raise",
        angleFn: calfRaiseDriveDeg,
        phaseConfig: CALF_RAISE.phaseThresholds,
        rules: CALF_RAISE_RULES,
        depthRuleId: "ankle-rom",
      }).count,
    ).toBe(1);
    const short = calfPose(100);
    expect(
      validate(short, "bottom", CALF_RAISE_RULES).results[0]?.triggered,
    ).toBe(true);
  });

  it("超人式抬离垫子计 1", () => {
    const flat = liftPose(8);
    const mid = liftPose(20);
    const up = liftPose(40);
    expect(supermanDriveDeg(flat)!).toBeGreaterThan(168);
    expect(supermanDriveDeg(up)!).toBeLessThan(152);
    expect(
      countReps(cycle(flat, mid, up), {
        exerciseId: "superman",
        angleFn: supermanDriveDeg,
        phaseConfig: SUPERMAN.phaseThresholds,
        rules: SUPERMAN_RULES,
        depthRuleId: "lift-height",
      }).count,
    ).toBe(1);
  });

  it("死虫伸腿计 1；髋抬离垫面才报", () => {
    const tucked = buildGluteBridgePose({ hipDeg: 90 });
    const mid = buildGluteBridgePose({ hipDeg: 130 });
    const extended = buildGluteBridgePose({ hipDeg: 165 });
    expect(deadBugDriveDeg(tucked)!).toBeGreaterThan(70);
    expect(deadBugDriveDeg(extended)!).toBeLessThan(35);
    expect(
      countReps(cycle(tucked, mid, extended), {
        exerciseId: "dead-bug",
        angleFn: deadBugDriveDeg,
        phaseConfig: DEAD_BUG.phaseThresholds,
        rules: DEAD_BUG_RULES,
        depthRuleId: "lumbar-contact",
      }).count,
    ).toBe(1);
    const lifted: Pose = [];
    lifted[LandmarkIndex.LeftShoulder] = lm(0.4, 0.62);
    lifted[LandmarkIndex.RightShoulder] = lm(0.4, 0.62);
    lifted[LandmarkIndex.LeftHip] = lm(0.62, 0.46);
    lifted[LandmarkIndex.RightHip] = lm(0.62, 0.46);
    expect(lumbarLiftDeg(lifted)!).toBeGreaterThan(23);
    expect(
      validate(lifted, "bottom", DEAD_BUG_RULES).results[0]?.triggered,
    ).toBe(true);
    expect(validate(extended, "bottom", DEAD_BUG_RULES).status).toBe("correct");
  });

  it("鸟狗伸平计 1；偏离超过 26° 在 bottom 里报且不计次", () => {
    expect(BIRD_DOG.phaseThresholds.bottomBelowDeg).toBe(40);
    const support = buildGluteBridgePose({ hipDeg: 100 });
    const mid = buildGluteBridgePose({ hipDeg: 130 });
    const level = buildGluteBridgePose({ hipDeg: 165 });
    expect(birdDogDeviationDeg(level)!).toBeLessThan(26);
    expect(
      countReps(cycle(support, mid, level), {
        exerciseId: "bird-dog",
        angleFn: deadBugDriveDeg,
        phaseConfig: BIRD_DOG.phaseThresholds,
        rules: BIRD_DOG_RULES,
        depthRuleId: "hip-level",
      }).count,
    ).toBe(1);
    const high = buildGluteBridgePose({ hipDeg: 148 });
    expect(birdDogDeviationDeg(high)!).toBeGreaterThan(26);
    expect(
      validate(high, "bottom", BIRD_DOG_RULES).results[0]?.triggered,
    ).toBe(true);
    expect(
      countReps(cycle(support, mid, high), {
        exerciseId: "bird-dog",
        angleFn: deadBugDriveDeg,
        phaseConfig: BIRD_DOG.phaseThresholds,
        rules: BIRD_DOG_RULES,
        depthRuleId: "hip-level",
      }).count,
    ).toBe(0);
  });

  it("卷腹卷起计 1", () => {
    const down = liftPose(8);
    const mid = liftPose(24);
    const up = liftPose(40);
    expect(crunchDriveDeg(down)!).toBeGreaterThan(165);
    expect(crunchDriveDeg(up)!).toBeLessThan(148);
    expect(
      countReps(cycle(down, mid, up), {
        exerciseId: "crunch",
        angleFn: crunchDriveDeg,
        phaseConfig: CRUNCH.phaseThresholds,
        rules: CRUNCH_RULES,
        depthRuleId: "crunch-height",
      }).count,
    ).toBe(1);
  });

  it("侧平板撑直按秒计，髋掉下去报 error", () => {
    const held = buildPushupPose({ elbowDeg: 160, hipDrop: 0 });
    expect(plankBodyLineDeg(held)!).toBeGreaterThanOrEqual(158);
    expect(plankDriveDeg(held)!).toBeLessThan(22);
    const state = countReps(frames(held, 40), {
      exerciseId: "side-plank",
      angleFn: plankDriveDeg,
      phaseConfig: SIDE_PLANK.phaseThresholds,
      rules: SIDE_PLANK_RULES,
      depthRuleId: "side-line",
      countMode: "hold_second",
    });
    expect(state.count).toBeGreaterThanOrEqual(1);
    const sag = buildPushupPose({ elbowDeg: 160, hipDrop: -0.28 });
    expect(plankBodyLineDeg(sag)!).toBeLessThan(158);
    const bad = validate(sag, "bottom", SIDE_PLANK_RULES);
    expect(bad.status).toBe("error");
    expect(bad.messages[0]).toMatch(/髋掉下去/);
  });

  it("悬垂提膝抬到髋高计 1", () => {
    const hang = buildGluteBridgePose({ hipDeg: 170 });
    const mid = buildGluteBridgePose({ hipDeg: 130 });
    const up = buildGluteBridgePose({ hipDeg: 80 });
    expect(hangingKneeHipAngle(hang)!).toBeGreaterThan(155);
    expect(hangingKneeHipAngle(up)!).toBeLessThan(105);
    expect(
      countReps(cycle(hang, mid, up), {
        exerciseId: "hanging-knee-raise",
        angleFn: hangingKneeHipAngle,
        phaseConfig: HANGING_KNEE_RAISE.phaseThresholds,
        rules: HANGING_KNEE_RAISE_RULES,
        depthRuleId: "knee-height",
      }).count,
    ).toBe(1);
    expect(
      validate(mid, "bottom", HANGING_KNEE_RAISE_RULES).results[0]?.triggered,
    ).toBe(true);
  });
});
