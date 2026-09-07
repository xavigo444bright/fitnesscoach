import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildDbFlyNearDriveMeasured, buildRdlNearHipMeasured } from "../boundary/poseTune.js";
import { buildDbFlyPose } from "../fixtures/dbFly.js";
import { buildPushupPose } from "../fixtures/pushup.js";
import { buildSquatPose } from "../fixtures/index.js";
import {
  DEFAULT_BENCH_PRESS_PHASE_CONFIG,
  DEFAULT_DB_ROW_PHASE_CONFIG,
  DEFAULT_OHP_PHASE_CONFIG,
  DEFAULT_PLANK_PHASE_CONFIG,
  DEFAULT_PULLUP_PHASE_CONFIG,
  DEFAULT_RDL_PHASE_CONFIG,
  DEFAULT_DB_FLY_PHASE_CONFIG,
  DEFAULT_DIP_PHASE_CONFIG,
  DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG,
  DEFAULT_CABLE_CROSSOVER_PHASE_CONFIG,
  DEFAULT_CHEST_PRESS_MACHINE_PHASE_CONFIG,
  DEFAULT_LATERAL_RAISE_PHASE_CONFIG,
  DEFAULT_FRONT_RAISE_PHASE_CONFIG,
  DEFAULT_REAR_DELT_FLY_PHASE_CONFIG,
  DEFAULT_FACE_PULL_PHASE_CONFIG,
  DEFAULT_PIKE_PUSHUP_PHASE_CONFIG,
  dbFlyDriveDeg,
  dbRowWorkingElbowAngle,
  meanVisibleElbowAngle,
  preferredVisibleElbowAngle,
  plankBodyLineDeg,
  plankDriveDeg,
  pullupWorkingElbowAngle,
  rdlHipAngle,
  lateralRaiseDriveDeg,
  initialLateralRaiseWristMemory,
  shoulderRaiseDriveDeg,
} from "../phase.js";
import {
  inferPoseUprightTurn,
  rotatePoseNormalized,
} from "../poseUpright.js";
import {
  countReps,
  initialRepCounterState,
  messageForRepReject,
  stepRep,
} from "../repCounter.js";
import {
  LandmarkIndex,
  type ExerciseDefinition,
  type Phase,
  type Pose,
  type Severity,
} from "../types.js";
import {
  BENCH_PRESS_RULES,
  DB_ROW_RULES,
  OHP_RULES,
  PLANK_RULES,
  PULLUP_RULES,
  RDL_RULES,
  DB_FLY_RULES,
  DIP_RULES,
  INCLINE_PUSHUP_RULES,
  CABLE_CROSSOVER_RULES,
  CHEST_PRESS_MACHINE_RULES,
  LATERAL_RAISE_RULES,
  FRONT_RAISE_RULES,
  REAR_DELT_FLY_RULES,
  FACE_PULL_RULES,
  PIKE_PUSHUP_RULES,
  validate,
  type EvaluableRule,
} from "../validate.js";
import { BENCH_PRESS, BENCH_PRESS_DEPTH_RULE_ID } from "./bench-press.js";
import { DB_ROW, DB_ROW_DEPTH_RULE_ID } from "./db-row.js";
import { OHP, OHP_DEPTH_RULE_ID } from "./ohp.js";
import { PLANK, PLANK_DEPTH_RULE_ID } from "./plank.js";
import { PULLUP, PULLUP_DEPTH_RULE_ID } from "./pullup.js";
import { RDL, RDL_DEPTH_RULE_ID } from "./rdl.js";
import { DB_FLY, DB_FLY_DEPTH_RULE_ID } from "./db-fly.js";
import { DIP, DIP_DEPTH_RULE_ID } from "./dip.js";
import { INCLINE_PUSHUP, INCLINE_PUSHUP_DEPTH_RULE_ID } from "./incline-pushup.js";
import { CABLE_CROSSOVER, CABLE_CROSSOVER_DEPTH_RULE_ID } from "./cable-crossover.js";
import {
  CHEST_PRESS_MACHINE,
  CHEST_PRESS_MACHINE_DEPTH_RULE_ID,
} from "./chest-press-machine.js";
import {
  LATERAL_RAISE,
  LATERAL_RAISE_DEPTH_RULE_ID,
} from "./lateral-raise.js";
import { FRONT_RAISE, FRONT_RAISE_DEPTH_RULE_ID } from "./front-raise.js";
import {
  REAR_DELT_FLY,
  REAR_DELT_FLY_DEPTH_RULE_ID,
} from "./rear-delt-fly.js";
import { FACE_PULL, FACE_PULL_DEPTH_RULE_ID } from "./face-pull.js";
import { PIKE_PUSHUP, PIKE_PUSHUP_DEPTH_RULE_ID } from "./pike-pushup.js";
import { buildRaisePose } from "../fixtures/raise.js";

interface DocRule {
  id: string;
  toleranceDeg: number;
  phases: Phase[];
  severity: Severity;
  message: string;
}

function parseDocRules(md: string, ids: string[]): DocRule[] {
  const rules: DocRule[] = [];
  for (const line of md.split("\n")) {
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 7) continue;
    const id = cells[0];
    if (!ids.includes(id)) continue;
    const toleranceDeg = Number(cells[3].replace(/[^\d.]/g, ""));
    const phaseCell = cells[4];
    const phases: Phase[] =
      phaseCell === "all"
        ? []
        : (phaseCell.split(/[,，]/).map((p) => p.trim()) as Phase[]);
    const severity = cells[5] as Severity;
    rules.push({ id, toleranceDeg, phases, severity, message: cells[6] });
  }
  return rules;
}

function assertContract(
  def: ExerciseDefinition,
  rules: EvaluableRule[],
  mdRel: string,
  ids: string[],
) {
  const md = readFileSync(
    fileURLToPath(new URL(mdRel, import.meta.url)),
    "utf8",
  );
  const docRules = parseDocRules(md, ids);
  expect(docRules.map((r) => r.id)).toEqual(ids);
  expect(def.rules.map((r) => r.id)).toEqual(ids);
  expect(rules.map((r) => r.id)).toEqual(ids);
  for (const doc of docRules) {
    const code = def.rules.find((r) => r.id === doc.id);
    expect(code).toBeDefined();
    expect(code!.toleranceDeg).toBe(doc.toleranceDeg);
    expect(code!.severity).toBe(doc.severity);
    expect(code!.message).toBe(doc.message);
    expect([...code!.phases].sort()).toEqual([...doc.phases].sort());
  }
}

const frames = (pose: Pose, n: number) => Array.from({ length: n }, () => pose);

function posesFromDump(rel: string): Pose[] | null {
  const dumpPath = fileURLToPath(new URL(rel, import.meta.url));
  if (!existsSync(dumpPath)) return null;
  const dump = JSON.parse(readFileSync(dumpPath, "utf8")) as {
    frames: Array<{
      landmarks: Array<{ x: number; y: number; visibility?: number } | null>;
    }>;
  };
  return dump.frames.map((fr) => {
    const pose: Pose = [];
    for (let i = 0; i < fr.landmarks.length; i += 1) {
      const lm = fr.landmarks[i];
      if (!lm) continue;
      pose[i] = { x: lm.x, y: lm.y, visibility: lm.visibility };
    }
    return pose.map((lm) =>
      lm && (lm.visibility == null || lm.visibility >= 0.2) ? lm : undefined,
    ) as Pose;
  });
}

function bottomSojourns(degs: number[], below: number): number {
  let sojourns = 0;
  let inBottom = false;
  for (const d of degs) {
    const atBottom = d <= below;
    if (atBottom && !inBottom) sojourns += 1;
    inBottom = atBottom;
  }
  return sojourns;
}

const HOLD = buildPushupPose({ elbowDeg: 165, hipDrop: 0 });
const COLLAPSED = buildPushupPose({ elbowDeg: 165, hipDrop: 0.28 });

describe("平板契约：plank.ts 与 plank-rules.md", () => {
  it("规则表 ↔ 代码", () => {
    assertContract(
      PLANK,
      PLANK_RULES,
      "../../../../docs/exercises/plank-rules.md",
      ["body-line"],
    );
    expect(PLANK.id).toBe("plank");
    expect(PLANK.name).toBe("平板支撑");
    expect(PLANK.cameraHint).toBe("side");
    expect(PLANK.phaseThresholds.standAboveDeg).toBe(32);
    expect(PLANK.phaseThresholds.bottomBelowDeg).toBe(22);
    expect(PLANK.phaseThresholds.confirmFrames).toBe(5);
    expect(PLANK_DEPTH_RULE_ID).toBe("body-line");
  });
});

describe("平板 body-line 单帧", () => {
  it("bottom：一线撑直不报；轮廓下垂不报", () => {
    const ok = validate(HOLD, "bottom", PLANK_RULES);
    expect(ok.status).toBe("correct");
    expect(ok.results.find((r) => r.id === "body-line")?.triggered).toBe(false);

    const bad = validate(COLLAPSED, "bottom", PLANK_RULES);
    expect(bad.status).toBe("correct");
  });

  it("衣裤拖地：髋膝都垂向支撑面，仍不报、能计秒", () => {
    const cloth = buildPushupPose({
      elbowDeg: 165,
      hipDrop: 0.22,
      kneeDrop: 0.2,
    });
    expect(plankBodyLineDeg(cloth)!).toBeGreaterThan(170);
    expect(validate(cloth, "bottom", PLANK_RULES).status).toBe("correct");
    expect(plankDriveDeg(cloth)!).toBeLessThan(22);
    const state = countReps(frames(cloth, 40), {
      phaseConfig: DEFAULT_PLANK_PHASE_CONFIG,
      rules: PLANK_RULES,
      angleFn: plankDriveDeg,
      depthRuleId: PLANK_DEPTH_RULE_ID,
      exerciseId: "plank",
      countMode: "hold_second",
    });
    expect(state.count).toBeGreaterThanOrEqual(1);
  });

  it("竖屏身体竖直：髋膝都垂向支撑面一侧，仍计秒", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.RightShoulder] = { x: 0.42, y: 0.22, visibility: 0.7 };
    pose[LandmarkIndex.RightHip] = { x: 0.62, y: 0.52, visibility: 0.7 };
    pose[LandmarkIndex.RightKnee] = { x: 0.66, y: 0.72, visibility: 0.6 };
    pose[LandmarkIndex.RightAnkle] = { x: 0.44, y: 0.9, visibility: 0.5 };
    pose[LandmarkIndex.RightElbow] = { x: 0.7, y: 0.34, visibility: 0.6 };
    pose[LandmarkIndex.RightWrist] = { x: 0.74, y: 0.4, visibility: 0.55 };
    expect(plankBodyLineDeg(pose)!).toBeGreaterThan(170);
    expect(plankDriveDeg(pose)!).toBeLessThan(22);
    expect(validate(pose, "bottom", PLANK_RULES).status).toBe("correct");
    const state = countReps(frames(pose, 40), {
      phaseConfig: DEFAULT_PLANK_PHASE_CONFIG,
      rules: PLANK_RULES,
      angleFn: plankDriveDeg,
      depthRuleId: PLANK_DEPTH_RULE_ID,
      exerciseId: "plank",
      countMode: "hold_second",
    });
    expect(state.count).toBeGreaterThanOrEqual(1);
  });

  it("轮廓下垂（旧塌髋夹具）与衣摆无法区分，仍计秒", () => {
    expect(plankBodyLineDeg(COLLAPSED)!).toBeGreaterThan(170);
    const state = countReps(frames(COLLAPSED, 40), {
      phaseConfig: DEFAULT_PLANK_PHASE_CONFIG,
      rules: PLANK_RULES,
      angleFn: plankDriveDeg,
      depthRuleId: PLANK_DEPTH_RULE_ID,
      exerciseId: "plank",
      countMode: "hold_second",
    });
    expect(state.count).toBeGreaterThanOrEqual(1);
  });

  it("撅臀：髋离开支撑面，只看髋，报 error、不计秒", () => {
    const pike = buildPushupPose({ elbowDeg: 165, hipDrop: -0.28 });
    expect(plankBodyLineDeg(pike)!).toBeLessThan(160);
    expect(validate(pike, "bottom", PLANK_RULES).status).toBe("error");
    const state = countReps(frames(pike, 40), {
      phaseConfig: DEFAULT_PLANK_PHASE_CONFIG,
      rules: PLANK_RULES,
      angleFn: plankDriveDeg,
      depthRuleId: PLANK_DEPTH_RULE_ID,
      exerciseId: "plank",
      countMode: "hold_second",
    });
    expect(state.count).toBe(0);
  });

  it("stand 不评估 body-line", () => {
    const res = validate(COLLAPSED, "stand", PLANK_RULES);
    expect(res.results.find((r) => r.id === "body-line")).toBeUndefined();
  });
});

describe("平板 hold_second 计数", () => {
  const opts = {
    phaseConfig: DEFAULT_PLANK_PHASE_CONFIG,
    rules: PLANK_RULES,
    angleFn: plankDriveDeg,
    depthRuleId: PLANK_DEPTH_RULE_ID,
    exerciseId: "plank" as const,
    countMode: "hold_second" as const,
  };

  it("撑直约 40 帧应 ≥1 秒", () => {
    expect(plankDriveDeg(HOLD)!).toBeLessThan(22);
    const state = countReps(frames(HOLD, 40), opts);
    expect(state.count).toBeGreaterThanOrEqual(1);
  });

  it("塌髋轮廓下垂仍计秒（与衣摆无法区分）", () => {
    const state = countReps(frames(COLLAPSED, 40), opts);
    expect(state.count).toBeGreaterThanOrEqual(1);
  });

  it("竖屏脚贴底边一侧关键点也能计秒", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.RightShoulder] = { x: 0.5, y: 0.18, visibility: 0.4 };
    pose[LandmarkIndex.RightHip] = { x: 0.5, y: 0.55, visibility: 0.35 };
    pose[LandmarkIndex.RightAnkle] = { x: 0.5, y: 0.995, visibility: 0.25 };
    expect(plankDriveDeg(pose)!).toBeLessThan(22);
    const state = countReps(frames(pose, 40), opts);
    expect(state.count).toBeGreaterThanOrEqual(1);
  });
});

describe("哑铃划船契约与计数", () => {
  const STAND = buildPushupPose({ elbowDeg: 160 });
  const BOTTOM = buildPushupPose({ elbowDeg: 85 });
  const SHALLOW = buildPushupPose({ elbowDeg: 130 });
  const opts = {
    phaseConfig: DEFAULT_DB_ROW_PHASE_CONFIG,
    rules: DB_ROW_RULES,
    angleFn: dbRowWorkingElbowAngle,
    depthRuleId: DB_ROW_DEPTH_RULE_ID,
    exerciseId: "db-row" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      DB_ROW,
      DB_ROW_RULES,
      "../../../../docs/exercises/db-row-rules.md",
      ["row-depth"],
    );
    expect(DB_ROW.name).toBe("哑铃划船");
    expect(DB_ROW.cameraHint).toBe("side");
    expect(DB_ROW.phaseThresholds.standAboveDeg).toBe(125);
    expect(DB_ROW.phaseThresholds.bottomBelowDeg).toBe(95);
  });

  it("bottom：85° 不报；130° 报 error", () => {
    const ok = validate(BOTTOM, "bottom", DB_ROW_RULES);
    expect(ok.results.find((r) => r.id === "row-depth")?.triggered).toBe(false);
    const bad = validate(SHALLOW, "bottom", DB_ROW_RULES);
    expect(bad.status).toBe("error");
    expect(bad.messages[0]).toMatch(/髋后/);
  });

  it("完整拉收计 1；半程 shallow", () => {
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    const state = countReps(full, opts);
    expect(state.count).toBe(1);
    expect(state.reps[0]!.counted).toBe(true);

    // 110° 介于 standAbove 125 与 bottomBelow 95：进 descend 但不进 bottom
    const MID = buildPushupPose({ elbowDeg: 110 });
    const seq = [
      ...frames(STAND, 6),
      ...frames(MID, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    let saw: { type: string; reason?: string } | null = null;
    let s = initialRepCounterState();
    for (const p of seq) {
      s = stepRep(s, p, opts);
      if (s.lastOutcome) saw = s.lastOutcome;
    }
    expect(saw).toEqual({ type: "rejected", reason: "shallow" });
    expect(messageForRepReject("shallow", "db-row")).toBe(
      "拉得不够高，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "db-row")).toBe(
      "拉得不够高，肘再往髋后收",
    );
  });
});

describe("站姿推举契约与计数", () => {
  const STAND = buildPushupPose({ elbowDeg: 165 });
  const BOTTOM = buildPushupPose({ elbowDeg: 90 });
  const SHALLOW = buildPushupPose({ elbowDeg: 130 });
  const opts = {
    phaseConfig: DEFAULT_OHP_PHASE_CONFIG,
    rules: OHP_RULES,
    angleFn: meanVisibleElbowAngle,
    depthRuleId: OHP_DEPTH_RULE_ID,
    exerciseId: "ohp" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      OHP,
      OHP_RULES,
      "../../../../docs/exercises/ohp-rules.md",
      ["torso-upright"],
    );
    expect(OHP.name).toBe("站姿推举");
    expect(OHP.phaseThresholds.standAboveDeg).toBe(145);
    expect(OHP.phaseThresholds.bottomBelowDeg).toBe(105);
  });

  it("完整锁肘计 1；半程 shallow", () => {
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "ohp")).toBe("没推直，未计入次数");
  });
});

describe("杠铃卧推契约与计数", () => {
  const STAND = buildPushupPose({ elbowDeg: 170 });
  const BOTTOM = buildPushupPose({ elbowDeg: 95 });
  const SHALLOW = buildPushupPose({ elbowDeg: 140 });
  const opts = {
    phaseConfig: DEFAULT_BENCH_PRESS_PHASE_CONFIG,
    rules: BENCH_PRESS_RULES,
    angleFn: meanVisibleElbowAngle,
    depthRuleId: BENCH_PRESS_DEPTH_RULE_ID,
    exerciseId: "bench-press" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      BENCH_PRESS,
      BENCH_PRESS_RULES,
      "../../../../docs/exercises/bench-press-rules.md",
      ["elbow-depth"],
    );
    expect(BENCH_PRESS.name).toBe("杠铃卧推");
    expect(BENCH_PRESS.phaseThresholds.standAboveDeg).toBe(160);
    expect(BENCH_PRESS.phaseThresholds.bottomBelowDeg).toBe(120);
  });

  it("触胸再推起计 1；半程 shallow", () => {
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "bench-press")).toBe(
      "没放到胸口，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "bench-press")).toBe(
      "杠没落到胸口，再下放一些",
    );
  });
});

describe("罗马尼亚硬拉契约与计数", () => {
  const STAND = buildRdlNearHipMeasured(168);
  const BOTTOM = buildRdlNearHipMeasured(100);
  const MID = buildRdlNearHipMeasured(135);
  const opts = {
    phaseConfig: DEFAULT_RDL_PHASE_CONFIG,
    rules: RDL_RULES,
    angleFn: rdlHipAngle,
    depthRuleId: RDL_DEPTH_RULE_ID,
    exerciseId: "rdl" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      RDL,
      RDL_RULES,
      "../../../../docs/exercises/rdl-rules.md",
      ["rdl-depth"],
    );
    expect(RDL.name).toBe("罗马尼亚硬拉");
    expect(RDL.cameraHint).toBe("side");
    expect(RDL.phaseThresholds.standAboveDeg).toBe(155);
    expect(RDL.phaseThresholds.bottomBelowDeg).toBe(115);
  });

  it("完整铰链计 1；半程 shallow", () => {
    expect(rdlHipAngle(STAND)!).toBeGreaterThan(155);
    expect(rdlHipAngle(BOTTOM)!).toBeLessThan(115);
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [...frames(STAND, 6), ...frames(MID, 12), ...frames(STAND, 6)];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "rdl")).toBe(
      "铰链不够深，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "rdl")).toBe(
      "铰链不够深，臀部再往后坐",
    );
  });
});

describe("引体向上契约与计数", () => {
  const STAND = buildPushupPose({ elbowDeg: 165 });
  const BOTTOM = buildPushupPose({ elbowDeg: 80 });
  const SHALLOW = buildPushupPose({ elbowDeg: 125 });
  const opts = {
    phaseConfig: DEFAULT_PULLUP_PHASE_CONFIG,
    rules: PULLUP_RULES,
    angleFn: pullupWorkingElbowAngle,
    depthRuleId: PULLUP_DEPTH_RULE_ID,
    exerciseId: "pullup" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      PULLUP,
      PULLUP_RULES,
      "../../../../docs/exercises/pullup-rules.md",
      ["pull-depth"],
    );
    expect(PULLUP.name).toBe("引体向上");
    expect(PULLUP.phaseThresholds.standAboveDeg).toBe(150);
    expect(PULLUP.phaseThresholds.bottomBelowDeg).toBe(100);
  });

  it("完整拉起到过杆计 1；半程 shallow", () => {
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "pullup")).toBe(
      "拉得不够高，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "pullup")).toBe(
      "拉得不够高，下巴再过杆",
    );
  });
});

describe("哑铃飞鸟契约与计数", () => {
  const STAND = buildDbFlyPose({ wristIncludedDeg: 18 });
  const BOTTOM = buildDbFlyPose({ wristIncludedDeg: 70 });
  const SHALLOW = buildDbFlyNearDriveMeasured(152);
  const opts = {
    phaseConfig: DEFAULT_DB_FLY_PHASE_CONFIG,
    rules: DB_FLY_RULES,
    angleFn: dbFlyDriveDeg,
    depthRuleId: DB_FLY_DEPTH_RULE_ID,
    exerciseId: "db-fly" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      DB_FLY,
      DB_FLY_RULES,
      "../../../../docs/exercises/db-fly-rules.md",
      ["fly-depth"],
    );
    expect(DB_FLY.name).toBe("哑铃飞鸟");
    expect(DB_FLY.cameraHint).toBe("side");
    expect(DB_FLY.phaseThresholds.standAboveDeg).toBe(155);
    expect(DB_FLY.phaseThresholds.bottomBelowDeg).toBe(145);
    expect(DB_FLY_DEPTH_RULE_ID).toBe("fly-depth");
  });

  it("完整开合计 1；半程 shallow", () => {
    expect(dbFlyDriveDeg(STAND)!).toBeGreaterThan(155);
    expect(dbFlyDriveDeg(BOTTOM)!).toBeLessThan(145);
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "db-fly")).toBe(
      "打开不够深，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "db-fly")).toBe(
      "打开不够深，手臂再打开一些",
    );
  });
});

describe("双杠臂屈伸契约与计数", () => {
  const STAND = buildPushupPose({ elbowDeg: 165 });
  const BOTTOM = buildPushupPose({ elbowDeg: 80 });
  const SHALLOW = buildPushupPose({ elbowDeg: 125 });
  const opts = {
    phaseConfig: DEFAULT_DIP_PHASE_CONFIG,
    rules: DIP_RULES,
    angleFn: preferredVisibleElbowAngle,
    depthRuleId: DIP_DEPTH_RULE_ID,
    exerciseId: "dip" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      DIP,
      DIP_RULES,
      "../../../../docs/exercises/dip-rules.md",
      ["dip-depth", "torso-lean"],
    );
    expect(DIP.name).toBe("双杠臂屈伸");
    expect(DIP.cameraHint).toBe("side");
    expect(DIP.phaseThresholds.standAboveDeg).toBe(150);
    expect(DIP.phaseThresholds.bottomBelowDeg).toBe(110);
    expect(DIP_DEPTH_RULE_ID).toBe("dip-depth");
  });

  it("完整屈伸计 1；半程 shallow", () => {
    expect(preferredVisibleElbowAngle(STAND)!).toBeGreaterThan(150);
    expect(preferredVisibleElbowAngle(BOTTOM)!).toBeLessThan(110);
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "dip")).toBe(
      "降得不够低，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "dip")).toBe(
      "降得不够低，肩再往下沉一些",
    );
  });

  it("3/4 PoseDump 跨 stand/bottom，完整计次 ≥1（有片才跑）", () => {
    const dumpPath = fileURLToPath(
      new URL(
        "../../../../media/trajectory-source/dip/dip-three_quarter-01.pose.json",
        import.meta.url,
      ),
    );
    if (!existsSync(dumpPath)) return;
    const dump = JSON.parse(readFileSync(dumpPath, "utf8")) as {
      frames: Array<{ landmarks: Array<{ x: number; y: number; visibility?: number } | null> }>;
    };
    const poses: Pose[] = dump.frames.map((fr) => {
      const pose: Pose = [];
      for (let i = 0; i < fr.landmarks.length; i += 1) {
        const lm = fr.landmarks[i];
        if (!lm) continue;
        pose[i] = { x: lm.x, y: lm.y, visibility: lm.visibility };
      }
      return pose.map((lm) =>
        lm && (lm.visibility == null || lm.visibility >= 0.2) ? lm : undefined,
      ) as Pose;
    });
    const degs = poses
      .map((p) => preferredVisibleElbowAngle(p))
      .filter((d): d is number => d != null);
    expect(degs.length).toBeGreaterThan(80);
    expect(Math.max(...degs)).toBeGreaterThan(150);
    expect(Math.min(...degs)).toBeLessThan(110);
    // 核窗 7s 第二圈在回锁途中结束，完整计次 ≥1；bottom 带应出现两次
    expect(countReps(poses, opts).count).toBeGreaterThanOrEqual(1);
    let sojourns = 0;
    let inBottom = false;
    for (const d of degs) {
      const atBottom = d <= 110;
      if (atBottom && !inBottom) sojourns += 1;
      inBottom = atBottom;
    }
    expect(sojourns).toBeGreaterThanOrEqual(2);
  });

  it("正面宽肩不报 torso-lean；3/4 直立底部要报", () => {
    const upright = buildSquatPose({ kneeDeg: 90, torsoLeanDeg: 4 });
    expect(
      validate(upright, "bottom", DIP_RULES).results.find(
        (r) => r.id === "torso-lean",
      )?.triggered,
    ).toBe(true);
    const frontish = upright.slice();
    const rs = frontish[LandmarkIndex.RightShoulder];
    if (rs) {
      frontish[LandmarkIndex.LeftShoulder] = { ...rs, x: rs.x - 0.22 };
    }
    expect(
      validate(frontish, "bottom", DIP_RULES).results.find(
        (r) => r.id === "torso-lean",
      )?.triggered,
    ).toBe(false);
  });
});

describe("上斜俯卧撑契约与计数", () => {
  const STAND = buildPushupPose({ elbowDeg: 170 });
  const BOTTOM = buildPushupPose({ elbowDeg: 90 });
  const SHALLOW = buildPushupPose({ elbowDeg: 135 });
  const opts = {
    phaseConfig: DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG,
    rules: INCLINE_PUSHUP_RULES,
    angleFn: meanVisibleElbowAngle,
    depthRuleId: INCLINE_PUSHUP_DEPTH_RULE_ID,
    exerciseId: "incline-pushup" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      INCLINE_PUSHUP,
      INCLINE_PUSHUP_RULES,
      "../../../../docs/exercises/incline-pushup-rules.md",
      ["elbow-depth", "body-line"],
    );
    expect(INCLINE_PUSHUP.name).toBe("上斜俯卧撑");
    expect(INCLINE_PUSHUP.cameraHint).toBe("side");
    expect(INCLINE_PUSHUP.phaseThresholds.standAboveDeg).toBe(160);
    expect(INCLINE_PUSHUP.phaseThresholds.bottomBelowDeg).toBe(120);
    expect(INCLINE_PUSHUP_DEPTH_RULE_ID).toBe("elbow-depth");
  });

  it("完整撑起计 1；半程 shallow", () => {
    expect(meanVisibleElbowAngle(STAND)!).toBeGreaterThan(160);
    expect(meanVisibleElbowAngle(BOTTOM)!).toBeLessThan(120);
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "incline-pushup")).toBe(
      "降得不够低，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "incline-pushup")).toBe(
      "胸口再靠近支撑面",
    );
  });

  it("侧面 PoseDump 跨 stand/bottom，完整计次 ≥1（有片才跑）", () => {
    const poses = posesFromDump(
      "../../../../media/trajectory-source/incline-pushup/incline-pushup-side-01.pose.json",
    );
    if (!poses) return;
    const degs = poses
      .map((p) => meanVisibleElbowAngle(p))
      .filter((d): d is number => d != null);
    expect(degs.length).toBeGreaterThan(40);
    expect(Math.max(...degs)).toBeGreaterThan(160);
    expect(Math.min(...degs)).toBeLessThan(120);
    expect(countReps(poses, opts).count).toBeGreaterThanOrEqual(1);
    expect(bottomSojourns(degs, 120)).toBeGreaterThanOrEqual(2);
  });

  it("正面宽肩不报 elbow-depth / body-line", () => {
    const shallow = buildPushupPose({ elbowDeg: 140 });
    expect(
      validate(shallow, "bottom", INCLINE_PUSHUP_RULES).results.find(
        (r) => r.id === "elbow-depth",
      )?.triggered,
    ).toBe(true);
    const frontish = shallow.slice();
    const rs = frontish[LandmarkIndex.RightShoulder];
    if (rs) {
      frontish[LandmarkIndex.LeftShoulder] = { ...rs, x: rs.x - 0.22 };
    }
    expect(
      validate(frontish, "bottom", INCLINE_PUSHUP_RULES).results.find(
        (r) => r.id === "elbow-depth",
      )?.triggered,
    ).toBe(false);
    const pike = buildPushupPose({ elbowDeg: 165, hipDrop: -0.28 });
    expect(
      validate(pike, "bottom", INCLINE_PUSHUP_RULES).results.find(
        (r) => r.id === "body-line",
      )?.triggered,
    ).toBe(true);
    const pikeFront = pike.slice();
    const prs = pikeFront[LandmarkIndex.RightShoulder];
    if (prs) {
      pikeFront[LandmarkIndex.LeftShoulder] = { ...prs, x: prs.x - 0.22 };
    }
    expect(
      validate(pikeFront, "bottom", INCLINE_PUSHUP_RULES).results.find(
        (r) => r.id === "body-line",
      )?.triggered,
    ).toBe(false);
  });
});

describe("绳索夹胸契约与计数", () => {
  const STAND = buildDbFlyPose({ wristIncludedDeg: 40 });
  const BOTTOM = buildDbFlyPose({ wristIncludedDeg: 115 });
  const SHALLOW = buildDbFlyPose({ wristIncludedDeg: 70 });
  const opts = {
    phaseConfig: DEFAULT_CABLE_CROSSOVER_PHASE_CONFIG,
    rules: CABLE_CROSSOVER_RULES,
    angleFn: dbFlyDriveDeg,
    depthRuleId: CABLE_CROSSOVER_DEPTH_RULE_ID,
    exerciseId: "cable-crossover" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      CABLE_CROSSOVER,
      CABLE_CROSSOVER_RULES,
      "../../../../docs/exercises/cable-crossover-rules.md",
      ["crossover-depth"],
    );
    expect(CABLE_CROSSOVER.name).toBe("绳索夹胸");
    expect(CABLE_CROSSOVER.cameraHint).toBe("front");
    expect(CABLE_CROSSOVER.phaseThresholds.standAboveDeg).toBe(120);
    expect(CABLE_CROSSOVER.phaseThresholds.bottomBelowDeg).toBe(80);
    expect(CABLE_CROSSOVER_DEPTH_RULE_ID).toBe("crossover-depth");
  });

  it("完整开合计 1；半程 shallow", () => {
    expect(dbFlyDriveDeg(STAND)!).toBeGreaterThan(120);
    expect(dbFlyDriveDeg(BOTTOM)!).toBeLessThan(80);
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "cable-crossover")).toBe(
      "打开不够开，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "cable-crossover")).toBe(
      "打开不够开，手臂再向两侧打开",
    );
  });

  it("正面 PoseDump 跨 stand/bottom，完整计次 ≥1（有片才跑）", () => {
    const poses = posesFromDump(
      "../../../../media/trajectory-source/cable-crossover/cable-crossover-front-01.pose.json",
    );
    if (!poses) return;
    const degs = poses
      .map((p) => dbFlyDriveDeg(p))
      .filter((d): d is number => d != null);
    expect(degs.length).toBeGreaterThan(40);
    expect(Math.max(...degs)).toBeGreaterThan(120);
    expect(Math.min(...degs)).toBeLessThan(80);
    expect(countReps(poses, opts).count).toBeGreaterThanOrEqual(1);
    expect(bottomSojourns(degs, 80)).toBeGreaterThanOrEqual(2);
  });
});

describe("坐姿推胸器契约与计数", () => {
  const STAND = buildPushupPose({ elbowDeg: 145 });
  const BOTTOM = buildPushupPose({ elbowDeg: 70 });
  const SHALLOW = buildPushupPose({ elbowDeg: 110 });
  const opts = {
    phaseConfig: DEFAULT_CHEST_PRESS_MACHINE_PHASE_CONFIG,
    rules: CHEST_PRESS_MACHINE_RULES,
    angleFn: meanVisibleElbowAngle,
    depthRuleId: CHEST_PRESS_MACHINE_DEPTH_RULE_ID,
    exerciseId: "chest-press-machine" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      CHEST_PRESS_MACHINE,
      CHEST_PRESS_MACHINE_RULES,
      "../../../../docs/exercises/chest-press-machine-rules.md",
      ["press-depth"],
    );
    expect(CHEST_PRESS_MACHINE.name).toBe("坐姿推胸器");
    expect(CHEST_PRESS_MACHINE.cameraHint).toBe("side");
    expect(CHEST_PRESS_MACHINE.phaseThresholds.standAboveDeg).toBe(130);
    expect(CHEST_PRESS_MACHINE.phaseThresholds.bottomBelowDeg).toBe(95);
    expect(CHEST_PRESS_MACHINE_DEPTH_RULE_ID).toBe("press-depth");
  });

  it("完整推收计 1；半程 shallow", () => {
    expect(meanVisibleElbowAngle(STAND)!).toBeGreaterThan(130);
    expect(meanVisibleElbowAngle(BOTTOM)!).toBeLessThan(95);
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "chest-press-machine")).toBe(
      "收得不够近，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "chest-press-machine")).toBe(
      "没收到胸口，再收回一些",
    );
  });

  it("侧面 PoseDump 跨 stand/bottom，完整计次 ≥1（有片才跑）", () => {
    const poses = posesFromDump(
      "../../../../media/trajectory-source/chest-press-machine/chest-press-machine-side-01.pose.json",
    );
    if (!poses) return;
    const degs = poses
      .map((p) => meanVisibleElbowAngle(p))
      .filter((d): d is number => d != null);
    expect(degs.length).toBeGreaterThan(40);
    expect(Math.max(...degs)).toBeGreaterThan(130);
    expect(Math.min(...degs)).toBeLessThan(95);
    expect(countReps(poses, opts).count).toBeGreaterThanOrEqual(1);
    expect(bottomSojourns(degs, 95)).toBeGreaterThanOrEqual(2);
  });
});

describe("哑铃侧平举契约与计数", () => {
  const STAND = buildRaisePose({ abductionDeg: 8 });
  const BOTTOM = buildRaisePose({ abductionDeg: 82 });
  const SHALLOW = buildRaisePose({ abductionDeg: 48 });
  const NICKED_STAND = buildRaisePose({ abductionDeg: 24 });
  const NICKED_BOTTOM = buildRaisePose({ abductionDeg: 66 });
  const opts = {
    phaseConfig: DEFAULT_LATERAL_RAISE_PHASE_CONFIG,
    rules: LATERAL_RAISE_RULES,
    angleFn: lateralRaiseDriveDeg,
    depthRuleId: LATERAL_RAISE_DEPTH_RULE_ID,
    exerciseId: "lateral-raise" as const,
  };

  function stolenHipPose(abductionDeg: number): Pose {
    const pose = buildRaisePose({ abductionDeg });
    pose[LandmarkIndex.LeftHip] = undefined;
    pose[LandmarkIndex.RightHip] = undefined;
    return pose;
  }

  it("规则表 ↔ 代码", () => {
    assertContract(
      LATERAL_RAISE,
      LATERAL_RAISE_RULES,
      "../../../../docs/exercises/lateral-raise-rules.md",
      ["raise-height"],
    );
    expect(LATERAL_RAISE.name).toBe("哑铃侧平举");
    expect(LATERAL_RAISE.cameraHint).toBe("front");
    expect(LATERAL_RAISE.phaseThresholds.standAboveDeg).toBe(155);
    expect(LATERAL_RAISE.phaseThresholds.bottomBelowDeg).toBe(115);
    expect(LATERAL_RAISE_DEPTH_RULE_ID).toBe("raise-height");
  });

  it("完整抬放计 1；半程 shallow", () => {
    expect(lateralRaiseDriveDeg(STAND)!).toBeGreaterThan(155);
    expect(lateralRaiseDriveDeg(BOTTOM)!).toBeLessThan(115);
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "lateral-raise")).toBe(
      "抬得不够高，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "lateral-raise")).toBe(
      "再抬高一些，到大约肩的高度",
    );
  });

  it("髋点缺失时仍跟肩-肘竖直外展计次", () => {
    expect(lateralRaiseDriveDeg(stolenHipPose(82))!).toBeLessThan(115);
    const full = [
      ...frames(stolenHipPose(8), 6),
      ...frames(stolenHipPose(82), 6),
      ...frames(stolenHipPose(8), 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
  });

  it("髋点吸到画幅中央时竖直外展仍进底", () => {
    const raised = buildRaisePose({ abductionDeg: 82 });
    raised[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.5, visibility: 1 };
    raised[LandmarkIndex.RightHip] = { x: 0.5, y: 0.5, visibility: 1 };
    expect(lateralRaiseDriveDeg(raised)!).toBeLessThan(115);
  });

  it("肘低于肩、腕已到肩高仍计 1（健身房正面常见）", () => {
    const stand = buildRaisePose({ abductionDeg: 10 });
    const bottom = buildRaisePose({
      abductionDeg: 82,
      elbowAbductionDeg: 48,
    });
    const elbowOnly = bottom.map((lm) => (lm ? { ...lm } : undefined)) as Pose;
    elbowOnly[LandmarkIndex.LeftWrist] = undefined;
    elbowOnly[LandmarkIndex.RightWrist] = undefined;
    expect(lateralRaiseDriveDeg(elbowOnly)!).toBeGreaterThan(115);
    expect(lateralRaiseDriveDeg(bottom)!).toBeLessThan(115);
    const full = [
      ...frames(stand, 6),
      ...frames(bottom, 6),
      ...frames(stand, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
  });

  it("腕顶到左右边仍进底并计 1（近景哑铃出画）", () => {
    const stand = buildRaisePose({ abductionDeg: 10 });
    const peak = buildRaisePose({
      abductionDeg: 82,
      elbowAbductionDeg: 48,
    });
    const pinned = peak.map((lm) => (lm ? { ...lm } : undefined)) as Pose;
    pinned[LandmarkIndex.LeftWrist] = {
      ...pinned[LandmarkIndex.LeftWrist]!,
      x: 0.01,
    };
    pinned[LandmarkIndex.RightWrist] = {
      ...pinned[LandmarkIndex.RightWrist]!,
      x: 0.99,
    };
    expect(lateralRaiseDriveDeg(pinned)!).toBeLessThan(115);
    const full = [
      ...frames(stand, 6),
      ...frames(pinned, 6),
      ...frames(stand, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
  });

  it("贴边时偏低 memory 不能盖掉 70° 地板", () => {
    const mem = initialLateralRaiseWristMemory();
    mem.left = 40;
    mem.right = 40;
    const pinned = buildRaisePose({
      abductionDeg: 40,
      elbowAbductionDeg: 30,
    });
    const ls = pinned[LandmarkIndex.LeftShoulder]!;
    const rs = pinned[LandmarkIndex.RightShoulder]!;
    pinned[LandmarkIndex.LeftWrist] = {
      x: 0.005,
      y: ls.y + 0.22,
      visibility: 1,
    };
    pinned[LandmarkIndex.RightWrist] = {
      x: 0.995,
      y: rs.y + 0.22,
      visibility: 1,
    };
    expect(lateralRaiseDriveDeg(pinned, mem)!).toBeLessThan(115);
    const stand = buildRaisePose({ abductionDeg: 10 });
    const full = [
      ...frames(stand, 6),
      ...frames(pinned, 6),
      ...frames(stand, 6),
    ];
    expect(
      countReps(full, { ...opts, angleFn: (p) => lateralRaiseDriveDeg(p, mem) })
        .count,
    ).toBe(1);
  });

  it("贴边检测用相机坐标，外展用抬正坐标", () => {
    const mem = initialLateralRaiseWristMemory();
    mem.left = 40;
    mem.right = 40;
    const upright = buildRaisePose({
      abductionDeg: 40,
      elbowAbductionDeg: 30,
    });
    const frame = upright.map((lm) => (lm ? { ...lm } : undefined)) as Pose;
    const ls = frame[LandmarkIndex.LeftShoulder]!;
    const rs = frame[LandmarkIndex.RightShoulder]!;
    frame[LandmarkIndex.LeftWrist] = {
      x: 0.005,
      y: ls.y + 0.22,
      visibility: 1,
    };
    frame[LandmarkIndex.RightWrist] = {
      x: 0.995,
      y: rs.y + 0.22,
      visibility: 1,
    };
    expect(lateralRaiseDriveDeg(upright)!).toBeGreaterThan(115);
    expect(lateralRaiseDriveDeg(upright, mem, frame)!).toBeLessThan(115);
  });

  it("横置抬正后仍能进底并计 1", () => {
    const stand = buildRaisePose({ abductionDeg: 10 });
    const bottom = buildRaisePose({ abductionDeg: 82 });
    const turn = inferPoseUprightTurn(rotatePoseNormalized(stand, 90));
    const upStand = rotatePoseNormalized(rotatePoseNormalized(stand, 90), turn);
    const upBottom = rotatePoseNormalized(
      rotatePoseNormalized(bottom, 90),
      turn,
    );
    expect(inferPoseUprightTurn(upStand)).toBe(0);
    expect(lateralRaiseDriveDeg(upStand)!).toBeGreaterThan(155);
    expect(lateralRaiseDriveDeg(upBottom)!).toBeLessThan(115);
    const full = [
      ...frames(upStand, 6),
      ...frames(upBottom, 6),
      ...frames(upStand, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
  });

  it("出画前腕记忆优于贴边垃圾角", () => {
    const mem = initialLateralRaiseWristMemory();
    const inFrame = buildRaisePose({
      abductionDeg: 82,
      elbowAbductionDeg: 48,
    });
    expect(lateralRaiseDriveDeg(inFrame, mem)!).toBeLessThan(115);
    const garbage = inFrame.map((lm) => (lm ? { ...lm } : undefined)) as Pose;
    const ls = garbage[LandmarkIndex.LeftShoulder]!;
    const rs = garbage[LandmarkIndex.RightShoulder]!;
    garbage[LandmarkIndex.LeftWrist] = {
      x: 0.005,
      y: ls.y + 0.25,
      visibility: 1,
    };
    garbage[LandmarkIndex.RightWrist] = {
      x: 0.995,
      y: rs.y + 0.25,
      visibility: 1,
    };
    expect(lateralRaiseDriveDeg(garbage, mem)!).toBeLessThan(115);
    expect(mem.left).toBeGreaterThan(65);
  });

  it("刚擦过 stand/bottom 阈值但峰谷差不足 50° 不计", () => {
    expect(lateralRaiseDriveDeg(NICKED_STAND)!).toBeGreaterThan(155);
    expect(lateralRaiseDriveDeg(NICKED_BOTTOM)!).toBeLessThan(115);
    expect(
      lateralRaiseDriveDeg(NICKED_STAND)! -
        lateralRaiseDriveDeg(NICKED_BOTTOM)!,
    ).toBeLessThan(50);
    const seq = [
      ...frames(NICKED_STAND, 6),
      ...frames(NICKED_BOTTOM, 6),
      ...frames(NICKED_STAND, 6),
    ];
    const state = countReps(seq, opts);
    expect(state.count).toBe(0);
    expect(state.reps.some((r) => r.counted)).toBe(false);
  });

  it("正面 PoseDump 跨 stand/bottom，完整计次 ≥1（有片才跑）", () => {
    const poses = posesFromDump(
      "../../../../media/trajectory-source/lateral-raise/lateral-raise-front-01.pose.json",
    );
    if (!poses) return;
    const degs = poses
      .map((p) => lateralRaiseDriveDeg(p))
      .filter((d): d is number => d != null);
    expect(degs.length).toBeGreaterThan(40);
    expect(Math.max(...degs)).toBeGreaterThan(155);
    expect(Math.min(...degs)).toBeLessThan(115);
    expect(countReps(poses, opts).count).toBeGreaterThanOrEqual(1);
    expect(bottomSojourns(degs, 115)).toBeGreaterThanOrEqual(2);
  });
});

describe("哑铃前平举契约与计数", () => {
  const STAND = buildRaisePose({ abductionDeg: 8, sideView: true });
  const BOTTOM = buildRaisePose({ abductionDeg: 82, sideView: true });
  const SHALLOW = buildRaisePose({ abductionDeg: 48, sideView: true });
  const opts = {
    phaseConfig: DEFAULT_FRONT_RAISE_PHASE_CONFIG,
    rules: FRONT_RAISE_RULES,
    angleFn: shoulderRaiseDriveDeg,
    depthRuleId: FRONT_RAISE_DEPTH_RULE_ID,
    exerciseId: "front-raise" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      FRONT_RAISE,
      FRONT_RAISE_RULES,
      "../../../../docs/exercises/front-raise-rules.md",
      ["raise-height"],
    );
    expect(FRONT_RAISE.name).toBe("哑铃前平举");
    expect(FRONT_RAISE.cameraHint).toBe("side");
    expect(FRONT_RAISE.phaseThresholds.standAboveDeg).toBe(155);
    expect(FRONT_RAISE.phaseThresholds.bottomBelowDeg).toBe(115);
    expect(FRONT_RAISE_DEPTH_RULE_ID).toBe("raise-height");
  });

  it("完整抬放计 1；半程 shallow", () => {
    expect(shoulderRaiseDriveDeg(STAND)!).toBeGreaterThan(155);
    expect(shoulderRaiseDriveDeg(BOTTOM)!).toBeLessThan(115);
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "front-raise")).toBe(
      "抬得不够高，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "front-raise")).toBe(
      "再抬高一些，到大约肩的高度",
    );
  });

  it("髋缺失时远侧肘腕相对竖直仍计 1", () => {
    const stand = buildRaisePose({ abductionDeg: 8, sideView: true });
    const bottom = buildRaisePose({ abductionDeg: 82, sideView: true });
    for (const pose of [stand, bottom]) {
      pose[LandmarkIndex.LeftHip] = undefined;
      pose[LandmarkIndex.RightHip] = undefined;
      pose[LandmarkIndex.LeftElbow] = undefined;
      pose[LandmarkIndex.LeftWrist] = undefined;
    }
    expect(shoulderRaiseDriveDeg(stand)!).toBeGreaterThan(155);
    expect(shoulderRaiseDriveDeg(bottom)!).toBeLessThan(115);
    const full = [
      ...frames(stand, 6),
      ...frames(bottom, 6),
      ...frames(stand, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
  });

  it("髋可见度不够时退回竖直外展仍进底", () => {
    const bottom = buildRaisePose({ abductionDeg: 82, sideView: true });
    bottom[LandmarkIndex.LeftHip] = { x: 0.5, y: 0.36, visibility: 0.1 };
    bottom[LandmarkIndex.RightHip] = { x: 0.5, y: 0.36, visibility: 0.1 };
    expect(shoulderRaiseDriveDeg(bottom)!).toBeLessThan(115);
  });

  it("近侧髋仍在、肘角透视偏小时腕竖直外展仍计 1", () => {
    const stand = buildRaisePose({ abductionDeg: 8, sideView: true });
    const bottom = buildRaisePose({
      abductionDeg: 82,
      elbowAbductionDeg: 18,
      sideView: true,
    });
    expect(shoulderRaiseDriveDeg(stand)!).toBeGreaterThan(155);
    expect(shoulderRaiseDriveDeg(bottom)!).toBeLessThan(115);
    const full = [
      ...frames(stand, 6),
      ...frames(bottom, 6),
      ...frames(stand, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
  });

  it("侧面 PoseDump 跨 stand/bottom，完整计次 ≥1（有片才跑）", () => {
    const poses = posesFromDump(
      "../../../../media/trajectory-source/front-raise/front-raise-side-01.pose.json",
    );
    if (!poses) return;
    const degs = poses
      .map((p) => shoulderRaiseDriveDeg(p))
      .filter((d): d is number => d != null);
    expect(degs.length).toBeGreaterThan(40);
    expect(Math.max(...degs)).toBeGreaterThan(155);
    expect(Math.min(...degs)).toBeLessThan(115);
    expect(countReps(poses, opts).count).toBeGreaterThanOrEqual(1);
    expect(bottomSojourns(degs, 115)).toBeGreaterThanOrEqual(2);
  });
});

describe("俯身飞鸟契约与计数", () => {
  const STAND = buildDbFlyPose({ wristIncludedDeg: 18 });
  const BOTTOM = buildDbFlyPose({ wristIncludedDeg: 70 });
  const SHALLOW = buildDbFlyPose({ wristIncludedDeg: 45 });
  const opts = {
    phaseConfig: DEFAULT_REAR_DELT_FLY_PHASE_CONFIG,
    rules: REAR_DELT_FLY_RULES,
    angleFn: dbFlyDriveDeg,
    depthRuleId: REAR_DELT_FLY_DEPTH_RULE_ID,
    exerciseId: "rear-delt-fly" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      REAR_DELT_FLY,
      REAR_DELT_FLY_RULES,
      "../../../../docs/exercises/rear-delt-fly-rules.md",
      ["fly-depth"],
    );
    expect(REAR_DELT_FLY.name).toBe("俯身飞鸟（后束）");
    expect(REAR_DELT_FLY.cameraHint).toBe("side");
    expect(REAR_DELT_FLY.phaseThresholds.standAboveDeg).toBe(155);
    expect(REAR_DELT_FLY.phaseThresholds.bottomBelowDeg).toBe(125);
    expect(REAR_DELT_FLY_DEPTH_RULE_ID).toBe("fly-depth");
  });

  it("完整开合计 1；半程 shallow", () => {
    expect(dbFlyDriveDeg(STAND)!).toBeGreaterThan(155);
    expect(dbFlyDriveDeg(BOTTOM)!).toBeLessThan(125);
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "rear-delt-fly")).toBe(
      "打开不够开，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "rear-delt-fly")).toBe(
      "打开不够开，手臂再向两侧打开",
    );
  });

  it("3/4 PoseDump 跨 stand/bottom，完整计次 ≥1（有片才跑）", () => {
    const poses = posesFromDump(
      "../../../../media/trajectory-source/rear-delt-fly/rear-delt-fly-three_quarter-01.pose.json",
    );
    if (!poses) return;
    const degs = poses
      .map((p) => dbFlyDriveDeg(p))
      .filter((d): d is number => d != null);
    expect(degs.length).toBeGreaterThan(40);
    expect(Math.max(...degs)).toBeGreaterThan(155);
    expect(Math.min(...degs)).toBeLessThan(125);
    expect(countReps(poses, opts).count).toBeGreaterThanOrEqual(1);
    expect(bottomSojourns(degs, 125)).toBeGreaterThanOrEqual(2);
  });
});

describe("面拉契约与计数", () => {
  const STAND = buildPushupPose({ elbowDeg: 150 });
  const BOTTOM = buildPushupPose({ elbowDeg: 80 });
  const SHALLOW = buildPushupPose({ elbowDeg: 115 });
  const opts = {
    phaseConfig: DEFAULT_FACE_PULL_PHASE_CONFIG,
    rules: FACE_PULL_RULES,
    angleFn: meanVisibleElbowAngle,
    depthRuleId: FACE_PULL_DEPTH_RULE_ID,
    exerciseId: "face-pull" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      FACE_PULL,
      FACE_PULL_RULES,
      "../../../../docs/exercises/face-pull-rules.md",
      ["pull-height"],
    );
    expect(FACE_PULL.name).toBe("面拉");
    expect(FACE_PULL.cameraHint).toBe("side");
    expect(FACE_PULL.phaseThresholds.standAboveDeg).toBe(130);
    expect(FACE_PULL.phaseThresholds.bottomBelowDeg).toBe(100);
    expect(FACE_PULL_DEPTH_RULE_ID).toBe("pull-height");
  });

  it("完整拉收计 1；半程 shallow", () => {
    expect(meanVisibleElbowAngle(STAND)!).toBeGreaterThan(130);
    expect(meanVisibleElbowAngle(BOTTOM)!).toBeLessThan(100);
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "face-pull")).toBe(
      "拉得不够近，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "face-pull")).toBe(
      "再拉向面部一些",
    );
  });

  it("3/4 PoseDump 跨 stand/bottom，完整计次 ≥1（有片才跑）", () => {
    const poses = posesFromDump(
      "../../../../media/trajectory-source/face-pull/face-pull-three_quarter-01.pose.json",
    );
    if (!poses) return;
    const degs = poses
      .map((p) => meanVisibleElbowAngle(p))
      .filter((d): d is number => d != null);
    expect(degs.length).toBeGreaterThan(40);
    expect(Math.max(...degs)).toBeGreaterThan(130);
    expect(Math.min(...degs)).toBeLessThan(100);
    expect(countReps(poses, opts).count).toBeGreaterThanOrEqual(1);
    expect(bottomSojourns(degs, 100)).toBeGreaterThanOrEqual(2);
  });
});

describe("派克俯卧撑契约与计数", () => {
  const STAND = buildPushupPose({ elbowDeg: 170, hipDrop: 0.22 });
  const BOTTOM = buildPushupPose({ elbowDeg: 90, hipDrop: 0.22 });
  const SHALLOW = buildPushupPose({ elbowDeg: 140, hipDrop: 0.22 });
  const opts = {
    phaseConfig: DEFAULT_PIKE_PUSHUP_PHASE_CONFIG,
    rules: PIKE_PUSHUP_RULES,
    angleFn: meanVisibleElbowAngle,
    depthRuleId: PIKE_PUSHUP_DEPTH_RULE_ID,
    exerciseId: "pike-pushup" as const,
  };

  it("规则表 ↔ 代码", () => {
    assertContract(
      PIKE_PUSHUP,
      PIKE_PUSHUP_RULES,
      "../../../../docs/exercises/pike-pushup-rules.md",
      ["elbow-depth", "pike-line"],
    );
    expect(PIKE_PUSHUP.name).toBe("派克俯卧撑");
    expect(PIKE_PUSHUP.cameraHint).toBe("side");
    expect(PIKE_PUSHUP.phaseThresholds.standAboveDeg).toBe(160);
    expect(PIKE_PUSHUP.phaseThresholds.bottomBelowDeg).toBe(120);
    expect(PIKE_PUSHUP_DEPTH_RULE_ID).toBe("elbow-depth");
  });

  it("完整升降计 1；半程 shallow", () => {
    expect(meanVisibleElbowAngle(STAND)!).toBeGreaterThan(160);
    expect(meanVisibleElbowAngle(BOTTOM)!).toBeLessThan(120);
    const full = [
      ...frames(STAND, 6),
      ...frames(BOTTOM, 6),
      ...frames(STAND, 6),
    ];
    expect(countReps(full, opts).count).toBe(1);
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    expect(countReps(seq, opts).count).toBe(0);
    expect(messageForRepReject("shallow", "pike-pushup")).toBe(
      "降得不够低，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "pike-pushup")).toBe(
      "头再靠近地面一些",
    );
  });

  it("侧面 PoseDump 跨 stand/bottom，完整计次 ≥1（有片才跑）", () => {
    const poses = posesFromDump(
      "../../../../media/trajectory-source/pike-pushup/pike-pushup-side-01.pose.json",
    );
    if (!poses) return;
    const degs = poses
      .map((p) => meanVisibleElbowAngle(p))
      .filter((d): d is number => d != null);
    expect(degs.length).toBeGreaterThan(40);
    expect(Math.max(...degs)).toBeGreaterThan(160);
    expect(Math.min(...degs)).toBeLessThan(120);
    expect(countReps(poses, opts).count).toBeGreaterThanOrEqual(1);
    expect(bottomSojourns(degs, 120)).toBeGreaterThanOrEqual(2);
  });
});

describe("驱动角", () => {
  it("plankDriveDeg：撑直低于撅臀", () => {
    const pike = buildPushupPose({ elbowDeg: 165, hipDrop: -0.28 });
    expect(plankBodyLineDeg(HOLD)!).toBeGreaterThan(160);
    expect(plankDriveDeg(HOLD)!).toBeLessThan(plankDriveDeg(pike)!);
  });

  it("竖屏脚贴底边 + 只见一侧也能算一线", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.RightShoulder] = {
      x: 0.5,
      y: 0.18,
      visibility: 0.4,
    };
    pose[LandmarkIndex.RightHip] = { x: 0.5, y: 0.55, visibility: 0.35 };
    pose[LandmarkIndex.RightAnkle] = { x: 0.5, y: 0.995, visibility: 0.25 };
    expect(plankBodyLineDeg(pose)!).toBeGreaterThan(170);
    expect(plankDriveDeg(pose)!).toBeLessThan(22);
  });

  it("左右标签拆开仍能算一线", () => {
    const pose: Pose = [];
    pose[LandmarkIndex.LeftShoulder] = { x: 0.48, y: 0.2, visibility: 0.4 };
    pose[LandmarkIndex.RightHip] = { x: 0.5, y: 0.52, visibility: 0.4 };
    pose[LandmarkIndex.LeftAnkle] = { x: 0.51, y: 0.92, visibility: 0.3 };
    expect(plankBodyLineDeg(pose)!).toBeGreaterThan(160);
  });

  it("划船/推举/卧推肘角 bottom < stand", () => {
    expect(dbRowWorkingElbowAngle(buildPushupPose({ elbowDeg: 85 }))!).toBeLessThan(
      95,
    );
    expect(meanVisibleElbowAngle(buildPushupPose({ elbowDeg: 90 }))!).toBeLessThan(
      105,
    );
  });

  it("RDL 铰链髋角低于锁髋；引体过杆肘低于悬垂", () => {
    expect(rdlHipAngle(buildRdlNearHipMeasured(100))!).toBeLessThan(
      rdlHipAngle(buildRdlNearHipMeasured(168))!,
    );
    expect(
      pullupWorkingElbowAngle(buildPushupPose({ elbowDeg: 80 }))!,
    ).toBeLessThan(
      pullupWorkingElbowAngle(buildPushupPose({ elbowDeg: 165 }))!,
    );
  });

  it("飞鸟合拢 drive 高于打开；缺一侧腕回退肘角", () => {
    const closed = buildDbFlyPose({ wristIncludedDeg: 18 });
    const open = buildDbFlyPose({ wristIncludedDeg: 70 });
    expect(dbFlyDriveDeg(closed)!).toBeGreaterThan(dbFlyDriveDeg(open)!);
    expect(dbFlyDriveDeg(closed)!).toBeGreaterThan(155);
    expect(dbFlyDriveDeg(open)!).toBeLessThan(145);
    const oneArm = closed.slice();
    oneArm[LandmarkIndex.RightWrist] = undefined;
    oneArm[LandmarkIndex.RightElbow] = undefined;
    expect(dbFlyDriveDeg(oneArm)).not.toBeNull();
  });

  it("双杠取可见度更高的一侧肘，不被远侧直臂均值带偏", () => {
    const pose = buildPushupPose({ elbowDeg: 70 }).slice();
    const rs = pose[LandmarkIndex.RightShoulder]!;
    pose[LandmarkIndex.LeftElbow] = {
      ...pose[LandmarkIndex.LeftElbow]!,
      visibility: 0.95,
    };
    pose[LandmarkIndex.RightElbow] = {
      x: rs.x,
      y: rs.y + 0.12,
      visibility: 0.35,
    };
    pose[LandmarkIndex.RightWrist] = {
      x: rs.x,
      y: rs.y + 0.24,
      visibility: 0.35,
    };
    expect(preferredVisibleElbowAngle(pose)!).toBeLessThan(90);
    expect(meanVisibleElbowAngle(pose)!).toBeGreaterThan(
      preferredVisibleElbowAngle(pose)!,
    );
  });
});
