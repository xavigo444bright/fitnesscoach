import { describe, expect, it } from "vitest";
import { ghostKeyframesFor } from "./exercises/ghostKeyframes.js";
import { buildSquatPose } from "./fixtures/index.js";
import { buildPullupHangPose } from "./fixtures/pullupHang.js";
import { buildPushupPose } from "./fixtures/pushup.js";
import { laterGhostPoses } from "./exercises/later-keyframes.js";
import { LandmarkIndex, type Landmark, type Pose } from "./types.js";
import {
  ExerciseSubjectLock,
  SUBJECT_SWITCH_FRAMES,
  ACTIVITY_BOOTSTRAP_FRAMES,
  ACTIVITY_GATE_HARD_DROP,
  ACTIVITY_GATE_REOPEN_CONFIRM,
  ACTIVITY_GATE_SOFT_CONFIRM,
  initialActivityGateState,
  maxTrajectoryOverlap,
  poseBoneOverlap,
  stepActivityGate,
  trajectoryTemplatesFor,
} from "./subjectSelect.js";
import { abortOpenRepCycle, initialRepCounterState, stepRep } from "./repCounter.js";
import {
  DEFAULT_BENCH_PRESS_PHASE_CONFIG,
  meanVisibleElbowAngle,
} from "./phase.js";
import { BENCH_PRESS_RULES } from "./validate.js";
import { BENCH_PRESS_DEPTH_RULE_ID } from "./exercises/bench-press.js";

function translate(pose: Pose, dx: number, dy: number): Pose {
  const out: Pose = [];
  for (let i = 0; i < pose.length; i += 1) {
    const lm = pose[i];
    if (!lm) continue;
    out[i] = { ...lm, x: lm.x + dx, y: lm.y + dy };
  }
  return out;
}

describe("trajectory overlap (FR-090)", () => {
  it("卧推模板：躺姿重合度高于站立路人", () => {
    const templates = trajectoryTemplatesFor("bench-press");
    const lying = ghostKeyframesFor("bench-press").stand;
    const standing = buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 8 });
    expect(maxTrajectoryOverlap(lying, templates)).toBeGreaterThan(
      maxTrajectoryOverlap(standing, templates) + 0.08,
    );
  });

  it("深蹲模板：站立重合度高于俯卧撑躺姿", () => {
    const templates = trajectoryTemplatesFor("squat");
    const squatStand = ghostKeyframesFor("squat").stand;
    const prone = buildPushupPose({ elbowDeg: 170 });
    expect(maxTrajectoryOverlap(squatStand, templates)).toBeGreaterThan(
      maxTrajectoryOverlap(prone, templates) + 0.08,
    );
  });

  it("骨段方向自比接近 1", () => {
    const p = ghostKeyframesFor("bench-press").bottom;
    expect(poseBoneOverlap(p, p)).toBeGreaterThan(0.99);
  });

  it("出画/贴边的假膝踝不把重合度打穿", () => {
    const clean = ghostKeyframesFor("lateral-raise").stand;
    const polluted: Pose = [];
    for (let i = 0; i < clean.length; i += 1) {
      const lm = clean[i];
      if (lm) polluted[i] = { ...lm };
    }
    polluted[LandmarkIndex.LeftKnee] = { x: 0.9, y: 0.99, visibility: 0.3 };
    polluted[LandmarkIndex.RightKnee] = { x: 0.1, y: 0.98, visibility: 0.3 };
    polluted[LandmarkIndex.LeftAnkle] = { x: 0.05, y: 1.04, visibility: 0.4 };
    polluted[LandmarkIndex.RightAnkle] = { x: 0.95, y: 1.03, visibility: 0.35 };
    expect(poseBoneOverlap(polluted, clean)).toBeGreaterThan(0.9);
    expect(poseBoneOverlap(polluted, clean)).toBeGreaterThan(
      0.5 * poseBoneOverlap(clean, clean),
    );
  });
});

describe("ExerciseSubjectLock", () => {
  it("卧推：画面里躺着的人赢过站立的人", () => {
    const lock = new ExerciseSubjectLock("bench-press");
    const lying = ghostKeyframesFor("bench-press").stand;
    const standing = translate(
      buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 8 }),
      0.25,
      0,
    );
    const picked = lock.pick([standing, lying]);
    expect(picked?.[LandmarkIndex.LeftShoulder]?.x).toBeCloseTo(
      lying[LandmarkIndex.LeftShoulder]!.x,
      5,
    );
  });

  it("已锁的人不会被略高面积的路人立刻抢走", () => {
    const lock = new ExerciseSubjectLock("bench-press");
    const lying = ghostKeyframesFor("bench-press").stand;
    expect(lock.pick([lying])?.[LandmarkIndex.LeftHip]?.x).toBeCloseTo(
      lying[LandmarkIndex.LeftHip]!.x,
      5,
    );
    const standing = translate(
      buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 8 }),
      0.3,
      0,
    );
    for (let i = 0; i < SUBJECT_SWITCH_FRAMES - 1; i += 1) {
      const picked = lock.pick([lying, standing]);
      expect(picked?.[LandmarkIndex.LeftHip]?.x).toBeCloseTo(
        lying[LandmarkIndex.LeftHip]!.x,
        5,
      );
      expect(lock.didSwitch()).toBe(false);
    }
  });

  it("轨迹重合度明显更高时，确认若干帧后换人", () => {
    const lock = new ExerciseSubjectLock("bench-press");
    const standing = translate(
      buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 8 }),
      0.2,
      0,
    );
    expect(lock.pick([standing])).toBeTruthy();
    const lying = ghostKeyframesFor("bench-press").bottom;
    let switched = false;
    for (let i = 0; i < SUBJECT_SWITCH_FRAMES + 2; i += 1) {
      lock.pick([standing, lying]);
      if (lock.didSwitch()) {
        switched = true;
        break;
      }
    }
    expect(switched).toBe(true);
    const after = lock.pick([standing, lying]);
    expect(after?.[LandmarkIndex.LeftShoulder]?.y).toBeCloseTo(
      lying[LandmarkIndex.LeftShoulder]!.y,
      5,
    );
  });

  it("引体：正后悬垂比弯腰、站立的人更像，确认后换锁", () => {
    const templates = trajectoryTemplatesFor("pullup");
    const hang = buildPullupHangPose({ elbowDeg: 160, view: "front" });
    const sideHang = buildPullupHangPose({ elbowDeg: 165, view: "side" });
    const wiping = buildPushupPose({ elbowDeg: 150 });
    const standing = buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 8 });
    const shoulder = standing[LandmarkIndex.LeftShoulder]!;
    standing[LandmarkIndex.LeftElbow] = {
      x: shoulder.x,
      y: shoulder.y + 0.12,
      visibility: 1,
    };
    standing[LandmarkIndex.LeftWrist] = {
      x: shoulder.x,
      y: shoulder.y + 0.24,
      visibility: 1,
    };
    standing[LandmarkIndex.RightElbow] = {
      x: shoulder.x + 0.02,
      y: shoulder.y + 0.12,
      visibility: 1,
    };
    standing[LandmarkIndex.RightWrist] = {
      x: shoulder.x + 0.02,
      y: shoulder.y + 0.24,
      visibility: 1,
    };
    const hangScore = maxTrajectoryOverlap(hang, templates);
    expect(hangScore).toBeGreaterThan(
      maxTrajectoryOverlap(wiping, templates) + 0.16,
    );
    expect(hangScore).toBeGreaterThan(
      maxTrajectoryOverlap(standing, templates) + 0.16,
    );
    expect(maxTrajectoryOverlap(sideHang, templates)).toBeGreaterThan(0.9);

    const lock = new ExerciseSubjectLock("pullup");
    const wiper = translate(wiping, -0.08, 0.02);
    expect(lock.pick([wiper])).toBeTruthy();
    let switched = false;
    for (let i = 0; i < SUBJECT_SWITCH_FRAMES + 2; i += 1) {
      lock.pick([wiper, hang]);
      if (lock.didSwitch()) switched = true;
    }
    expect(switched).toBe(true);
    const after = lock.pick([wiper, hang]);
    expect(after?.[LandmarkIndex.LeftWrist]?.y).toBeLessThan(
      after?.[LandmarkIndex.LeftShoulder]?.y ?? 1,
    );
  });

  it("后接入的动作有正侧火柴人", () => {
    const templates = trajectoryTemplatesFor("lat-pulldown");
    expect(templates.length).toBeGreaterThan(0);
    expect(laterGhostPoses("squat")).toBeNull();
    const spreads = templates.map((p) => {
      const left = p[LandmarkIndex.LeftShoulder]!;
      const right = p[LandmarkIndex.RightShoulder]!;
      return Math.abs(right.x - left.x);
    });
    expect(Math.max(...spreads)).toBeGreaterThan(0.08);
    expect(Math.min(...spreads)).toBeLessThan(0.05);
  });

  it("重合度分不开时，走行程的人在确认后换锁", () => {
    const templates = laterGhostPoses("lat-pulldown")!;
    const stand = templates[0]!;
    const bottom = templates[2]!;
    const big = scalePose(stand, 1.15);
    const lifter = translate(bottom, 0.22, 0);
    const lock = new ExerciseSubjectLock("lat-pulldown");
    expect(lock.pick([big])?.[LandmarkIndex.LeftShoulder]?.x).toBeCloseTo(
      big[LandmarkIndex.LeftShoulder]!.x,
      5,
    );
    let switched = false;
    for (let i = 0; i < SUBJECT_SWITCH_FRAMES; i += 1) {
      lock.pick([big, lifter]);
      if (lock.didSwitch()) switched = true;
    }
    expect(switched).toBe(true);
    const after = lock.pick([big, lifter]);
    expect(after?.[LandmarkIndex.LeftShoulder]?.x).toBeCloseTo(
      lifter[LandmarkIndex.LeftShoulder]!.x,
      5,
    );
  });

  it("没有模板时，读不到行程就不计", () => {
    const lock = new ExerciseSubjectLock("not-an-exercise");
    const idle: Pose = [];
    idle[LandmarkIndex.LeftShoulder] = { x: 0.4, y: 0.4, visibility: 1 };
    idle[LandmarkIndex.RightShoulder] = { x: 0.6, y: 0.4, visibility: 1 };
    idle[LandmarkIndex.LeftHip] = { x: 0.42, y: 0.6, visibility: 1 };
    idle[LandmarkIndex.RightHip] = { x: 0.58, y: 0.6, visibility: 1 };
    expect(lock.pick([idle])).toBeTruthy();
    expect(lock.isExerciseActive()).toBe(false);
  });
});

function scalePose(pose: Pose, scale: number): Pose {
  const out: Pose = [];
  for (let i = 0; i < pose.length; i += 1) {
    const lm = pose[i];
    if (!lm) continue;
    const next: Landmark = {
      ...lm,
      x: 0.5 + (lm.x - 0.5) * scale,
      y: 0.5 + (lm.y - 0.5) * scale,
    };
    out[i] = next;
  }
  return out;
}

describe("activity gate (FR-090)", () => {
  it("硬下降当帧关引擎；相对基线，不绑动作 id", () => {
    let g = initialActivityGateState();
    for (let i = 0; i < ACTIVITY_BOOTSTRAP_FRAMES; i += 1) {
      g = stepActivityGate(g, 0.92, true);
    }
    expect(g.engineOn).toBe(true);
    g = stepActivityGate(g, 0.92 - ACTIVITY_GATE_HARD_DROP, true);
    expect(g.engineOn).toBe(false);
    expect(g.latchedOff).toBe(true);
  });

  it("小幅波动保持开；软下降需连续确认", () => {
    let g = initialActivityGateState();
    for (let i = 0; i < ACTIVITY_BOOTSTRAP_FRAMES; i += 1) {
      g = stepActivityGate(g, 0.9, true);
    }
    g = stepActivityGate(g, 0.82, true);
    expect(g.engineOn).toBe(true);
    for (let i = 0; i < ACTIVITY_GATE_SOFT_CONFIRM - 1; i += 1) {
      g = stepActivityGate(g, 0.72, true);
      if (i < ACTIVITY_GATE_SOFT_CONFIRM - 2) expect(g.engineOn).toBe(true);
    }
    g = stepActivityGate(g, 0.72, true);
    expect(g.engineOn).toBe(false);
  });

  it("关闸后回到基线附近确认若干帧才重开", () => {
    let g = initialActivityGateState();
    for (let i = 0; i < ACTIVITY_BOOTSTRAP_FRAMES; i += 1) {
      g = stepActivityGate(g, 0.95, true);
    }
    g = stepActivityGate(g, 0.1, true);
    expect(g.engineOn).toBe(false);
    for (let i = 0; i < ACTIVITY_GATE_REOPEN_CONFIRM - 1; i += 1) {
      g = stepActivityGate(g, 0.95, true);
      expect(g.engineOn).toBe(false);
    }
    g = stepActivityGate(g, 0.95, true);
    expect(g.engineOn).toBe(true);
  });

  it("无模板时始终开（未知动作不误冻）", () => {
    let g = initialActivityGateState();
    g = stepActivityGate(g, 0, false);
    expect(g.engineOn).toBe(true);
  });

  it("躺姿动作：站起来后门关，中途周期不结算成 counted", () => {
    const lock = new ExerciseSubjectLock("bench-press");
    const lyingStand = buildPushupPose({ elbowDeg: 170 });
    const lyingBottom = buildPushupPose({ elbowDeg: 95 });
    const standing = buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 8 });
    const opts = {
      phaseConfig: DEFAULT_BENCH_PRESS_PHASE_CONFIG,
      rules: BENCH_PRESS_RULES,
      angleFn: meanVisibleElbowAngle,
      depthRuleId: BENCH_PRESS_DEPTH_RULE_ID,
      exerciseId: "bench-press" as const,
    };
    let state = initialRepCounterState();
    for (let i = 0; i < 8; i += 1) {
      lock.pick([lyingStand]);
      if (lock.isExerciseActive()) state = stepRep(state, lyingStand, opts);
    }
    for (let i = 0; i < 8; i += 1) {
      lock.pick([lyingBottom]);
      if (lock.isExerciseActive()) state = stepRep(state, lyingBottom, opts);
    }
    expect(lock.isExerciseActive()).toBe(true);
    expect(state.phaseState.phase).not.toBe("stand");
    const countBefore = state.count;
    for (let i = 0; i < 8; i += 1) {
      lock.pick([standing]);
      if (lock.isExerciseActive()) {
        state = stepRep(state, standing, opts);
      } else {
        state = abortOpenRepCycle(state);
      }
    }
    expect(lock.isExerciseActive()).toBe(false);
    expect(state.count).toBe(countBefore);
    expect(state.lastOutcome).toBeNull();
    expect(state.phaseState.phase).toBe("stand");
  });

  it("站立动作顶：重合度仍高，门保持开", () => {
    const lock = new ExerciseSubjectLock("squat");
    const stand = ghostKeyframesFor("squat").stand;
    const bottom = ghostKeyframesFor("squat").bottom;
    for (let i = 0; i < 12; i += 1) lock.pick([stand]);
    expect(lock.isExerciseActive()).toBe(true);
    for (let i = 0; i < 8; i += 1) lock.pick([bottom]);
    expect(lock.isExerciseActive()).toBe(true);
    for (let i = 0; i < 8; i += 1) lock.pick([stand]);
    expect(lock.isExerciseActive()).toBe(true);
  });
});
