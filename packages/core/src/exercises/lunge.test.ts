import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSquatPose } from "../fixtures/index.js";
import {
  DEFAULT_LUNGE_PHASE_CONFIG,
  lungeWorkingKneeAngle,
} from "../phase.js";
import {
  countReps,
  initialRepCounterState,
  messageForRepReject,
  stepRep,
} from "../repCounter.js";
import type { Phase, Pose, Severity } from "../types.js";
import { LUNGE_RULES, validate } from "../validate.js";
import { LUNGE, LUNGE_DEPTH_RULE_ID } from "./lunge.js";

interface DocRule {
  id: string;
  toleranceDeg: number;
  phases: Phase[];
  severity: Severity;
  message: string;
}

const MD_PATH = fileURLToPath(
  new URL("../../../../docs/exercises/lunge-rules.md", import.meta.url),
);

function parseDocRules(md: string): DocRule[] {
  const lines = md.split("\n");
  const rules: DocRule[] = [];
  for (const line of lines) {
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 7) continue;
    const id = cells[0];
    if (!["lunge-depth", "torso-upright"].includes(id)) continue;
    const toleranceDeg = Number(cells[3].replace(/[^\d.]/g, ""));
    const phaseCell = cells[4];
    const phases: Phase[] =
      phaseCell === "all"
        ? []
        : (phaseCell.split(/[,，]/).map((p) => p.trim()) as Phase[]);
    const severity = cells[5] as Severity;
    const message = cells[6];
    rules.push({ id, toleranceDeg, phases, severity, message });
  }
  return rules;
}

const frames = (pose: Pose, n: number) => Array.from({ length: n }, () => pose);

const STAND = buildSquatPose({ kneeDeg: 165, torsoLeanDeg: 10 });
const MID = buildSquatPose({ kneeDeg: 125, torsoLeanDeg: 18 });
const BOTTOM = buildSquatPose({ kneeDeg: 85, torsoLeanDeg: 22 });
const SHALLOW = buildSquatPose({ kneeDeg: 130, torsoLeanDeg: 16 });
const DEPTH_FAULT = buildSquatPose({ kneeDeg: 125, torsoLeanDeg: 18 });

const lungeRepOpts = {
  phaseConfig: DEFAULT_LUNGE_PHASE_CONFIG,
  rules: LUNGE_RULES,
  angleFn: lungeWorkingKneeAngle,
  depthRuleId: LUNGE_DEPTH_RULE_ID,
  exerciseId: "lunge" as const,
};

describe("弓步契约：lunge.ts 与 lunge-rules.md", () => {
  const md = readFileSync(MD_PATH, "utf8");
  const docRules = parseDocRules(md);

  it("实现 lunge-depth + torso-upright；膝内扣为 P2 不入库", () => {
    expect(docRules.map((r) => r.id)).toEqual(["lunge-depth", "torso-upright"]);
    expect(LUNGE.rules.map((r) => r.id)).toEqual([
      "lunge-depth",
      "torso-upright",
    ]);
  });

  for (const doc of docRules) {
    it(`规则 ${doc.id}`, () => {
      const code = LUNGE.rules.find((r) => r.id === doc.id);
      expect(code).toBeDefined();
      expect(code!.toleranceDeg).toBe(doc.toleranceDeg);
      expect(code!.severity).toBe(doc.severity);
      expect(code!.message).toBe(doc.message);
      expect([...code!.phases].sort()).toEqual([...doc.phases].sort());
    });
  }

  it("id/name/机位来自 frontmatter", () => {
    expect(LUNGE.id).toBe("lunge");
    expect(LUNGE.name).toBe("弓步蹲");
    expect(LUNGE.cameraHint).toBe("side");
  });

  it("相位阈值与 lunge-rules 一致", () => {
    expect(LUNGE.phaseThresholds.standAboveDeg).toBe(150);
    expect(LUNGE.phaseThresholds.bottomBelowDeg).toBe(100);
    expect(LUNGE.phaseThresholds.confirmFrames).toBe(5);
  });
});

describe("弓步 lunge-depth 单帧", () => {
  it("强制 bottom：膝 85° 不报；125° 报 error", () => {
    const ok = validate(BOTTOM, "bottom", LUNGE_RULES);
    expect(ok.status).toBe("correct");
    expect(ok.results.find((r) => r.id === "lunge-depth")?.triggered).toBe(
      false,
    );

    const bad = validate(DEPTH_FAULT, "bottom", LUNGE_RULES);
    expect(bad.status).toBe("error");
    expect(bad.messages[0]).toMatch(/前膝再弯/);
  });

  it("stand 不评估 lunge-depth", () => {
    const res = validate(DEPTH_FAULT, "stand", LUNGE_RULES);
    expect(res.results.find((r) => r.id === "lunge-depth")).toBeUndefined();
  });
});

describe("弓步 rep 计数", () => {
  const oneCycle = (): Pose[] => [
    ...frames(STAND, 6),
    ...frames(MID, 6),
    ...frames(BOTTOM, 6),
    ...frames(MID, 6),
    ...frames(STAND, 6),
  ];

  it("完整下到约直角计 1", () => {
    const state = countReps(oneCycle(), lungeRepOpts);
    expect(state.count).toBe(1);
    expect(state.reps[0]!.counted).toBe(true);
  });

  it("未进 bottom → shallow；文案来自 rules", () => {
    const seq = [
      ...frames(STAND, 6),
      ...frames(SHALLOW, 12),
      ...frames(STAND, 6),
    ];
    const counted = countReps(seq, lungeRepOpts);
    expect(counted.count).toBe(0);
    expect(counted.reps.length).toBe(0);

    let saw: { type: string; reason?: string } | null = null;
    let state = initialRepCounterState();
    for (const p of seq) {
      state = stepRep(state, p, lungeRepOpts);
      if (state.lastOutcome) saw = state.lastOutcome;
    }
    expect(saw).toEqual({ type: "rejected", reason: "shallow" });
    expect(messageForRepReject("shallow", "lunge")).toBe(
      "蹲得不够深，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "lunge")).toBe(
      "蹲得不够深，前膝再弯一些",
    );
  });
});

describe("lungeWorkingKneeAngle", () => {
  it("取两侧更弯的一膝", () => {
    expect(lungeWorkingKneeAngle(BOTTOM)!).toBeLessThan(100);
    expect(lungeWorkingKneeAngle(STAND)!).toBeGreaterThan(150);
  });
});
