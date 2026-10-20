import { describe, expect, it } from "vitest";
import { buildPushupPose } from "./fixtures/pushup.js";
import {
  LAT_PULLDOWN_ARM_HOLD_FRAMES,
  LatPulldownArmHold,
} from "./latPulldownArms.js";
import { latPulldownWorkingElbowAngle, pullupWorkingElbowAngle } from "./phase.js";
import { countReps } from "./repCounter.js";
import { LandmarkIndex, type Landmark, type Pose } from "./types.js";
import { LAT_PULLDOWN_RULES, validate } from "./validate.js";
import { LAT_PULLDOWN } from "./exercises/phaseG.js";

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

function lm(x: number, y: number, z = 0): Landmark {
  return { x, y, z, visibility: 0.9 };
}

/** 坐姿下拉：肩在上、髋在下，左右对称。 */
function pullPose(
  elbow: { x: number; y: number; z?: number },
  wrist: { x: number; y: number; z?: number },
): Pose {
  const pose: Pose = [];
  pose[LandmarkIndex.LeftShoulder] = lm(0.46, 0.32);
  pose[LandmarkIndex.RightShoulder] = lm(0.54, 0.32);
  pose[LandmarkIndex.LeftElbow] = lm(elbow.x, elbow.y, elbow.z ?? 0);
  pose[LandmarkIndex.RightElbow] = lm(1 - elbow.x, elbow.y, elbow.z ?? 0);
  pose[LandmarkIndex.LeftWrist] = lm(wrist.x, wrist.y, wrist.z ?? 0);
  pose[LandmarkIndex.RightWrist] = lm(1 - wrist.x, wrist.y, wrist.z ?? 0);
  pose[LandmarkIndex.LeftHip] = lm(0.47, 0.64);
  pose[LandmarkIndex.RightHip] = lm(0.53, 0.64);
  return pose;
}

const overhead = () =>
  pullPose({ x: 0.46, y: 0.16 }, { x: 0.46, y: 0.05 });

describe("高位下拉臂链", () => {
  it("画面里折向镜头的肘，三维角能进底，平面角被当成折叠", () => {
    const bottom: Pose = [];
    bottom[LandmarkIndex.LeftShoulder] = lm(0.45, 0.3, 0);
    bottom[LandmarkIndex.LeftElbow] = lm(0.46, 0.48, 0.05);
    bottom[LandmarkIndex.LeftWrist] = lm(0.46, 0.34, 0.22);
    expect(pullupWorkingElbowAngle(bottom)!).toBeLessThan(15);
    expect(latPulldownWorkingElbowAngle(bottom)!).toBeLessThan(105);
    expect(latPulldownWorkingElbowAngle(bottom)!).toBeGreaterThan(15);
  });

  it("伸直仍高于 145，平面夹具的完整下拉仍计 1", () => {
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
    const fault = validate(mid, "bottom", LAT_PULLDOWN_RULES);
    expect(fault.results.find((r) => r.id === "pull-depth")?.triggered).toBe(
      true,
    );
  });

  it("肘一帧掉到髋下、手还在杆上时，计次沿用上一帧，画骨不补旧点", () => {
    const hold = new LatPulldownArmHold();
    const up = overhead();
    hold.step(up);
    const snapped = pullPose({ x: 0.46, y: 0.72 }, { x: 0.46, y: 0.05 });
    const framed = hold.step(snapped);
    expect(framed.count[LandmarkIndex.LeftElbow]?.y).toBeCloseTo(0.16, 2);
    expect(latPulldownWorkingElbowAngle(framed.count)!).toBeGreaterThan(145);
    expect(framed.draw[LandmarkIndex.LeftElbow]).toBeUndefined();
    expect(framed.draw[LandmarkIndex.LeftWrist]?.y).toBeCloseTo(0.05, 2);
    expect(snapped[LandmarkIndex.LeftElbow]?.y).toBeCloseTo(0.72, 2);
  });

  it("整条手臂缩在大腿上时不计次，画骨用当前点", () => {
    const hold = new LatPulldownArmHold();
    hold.step(overhead());
    const blob = pullPose({ x: 0.48, y: 0.66 }, { x: 0.5, y: 0.68 });
    for (let i = 0; i < 8; i += 1) {
      const framed = hold.step(blob);
      expect(framed.count[LandmarkIndex.LeftElbow]).toBeUndefined();
      expect(latPulldownWorkingElbowAngle(framed.count)).toBeNull();
      expect(framed.draw[LandmarkIndex.LeftElbow]?.y).toBeCloseTo(0.66, 2);
    }
    const fresh = new LatPulldownArmHold();
    const stripped = fresh.step(blob);
    expect(stripped.count[LandmarkIndex.LeftElbow]).toBeUndefined();
    expect(stripped.count[LandmarkIndex.LeftWrist]).toBeUndefined();
    expect(stripped.draw[LandmarkIndex.LeftElbow]?.y).toBeCloseTo(0.66, 2);
    expect(latPulldownWorkingElbowAngle(stripped.count)).toBeNull();
  });

  it("肩离开上一帧的肘时，计次立刻丢掉器械上的旧点", () => {
    const hold = new LatPulldownArmHold();
    hold.step(overhead());
    const gone = pullPose({ x: 0.2, y: 0.9 }, { x: 0.15, y: 0.95 });
    gone[LandmarkIndex.LeftShoulder] = lm(0.46, 0.9);
    gone[LandmarkIndex.RightShoulder] = lm(0.54, 0.9);
    const framed = hold.step(gone);
    expect(framed.count[LandmarkIndex.LeftElbow]?.y ?? -1).not.toBeCloseTo(0.16, 1);
    expect(framed.draw[LandmarkIndex.LeftElbow]?.y ?? -1).not.toBeCloseTo(0.16, 1);
  });

  it("顺着手臂走的下拉会跟上，跳到旁边的点计次要稳住，画骨马上用新点", () => {
    const hold = new LatPulldownArmHold();
    let elbowY = 0.18;
    let wristY = 0.06;
    let elbowX = 0.46;
    hold.step(pullPose({ x: elbowX, y: elbowY }, { x: 0.46, y: wristY }));
    for (let i = 0; i < 6; i += 1) {
      elbowY += 0.025;
      elbowX -= 0.01;
      wristY += 0.03;
      const out = hold.step(
        pullPose({ x: elbowX, y: elbowY }, { x: 0.46, y: wristY }),
      );
      expect(out.count[LandmarkIndex.LeftElbow]?.y).toBeCloseTo(elbowY, 2);
      expect(out.draw[LandmarkIndex.LeftElbow]?.y).toBeCloseTo(elbowY, 2);
    }
    const jumped = new LatPulldownArmHold();
    const base = overhead();
    jumped.step(base);
    const aside = pullPose({ x: 0.7, y: 0.16 }, { x: 0.7, y: 0.05 });
    for (let i = 0; i < LAT_PULLDOWN_ARM_HOLD_FRAMES - 1; i += 1) {
      const out = jumped.step(aside);
      expect(out.count[LandmarkIndex.LeftElbow]?.x).toBeCloseTo(0.46, 2);
      expect(out.draw[LandmarkIndex.LeftElbow]?.x).toBeCloseTo(0.7, 2);
    }
    const accepted = jumped.step(aside);
    expect(accepted.count[LandmarkIndex.LeftElbow]?.x).toBeCloseTo(0.7, 2);
    expect(accepted.draw[LandmarkIndex.LeftElbow]?.x).toBeCloseTo(0.7, 2);
  });
});
