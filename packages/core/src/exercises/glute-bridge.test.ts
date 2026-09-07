import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildGluteBridgePose } from "../fixtures/gluteBridge.js";
import {
  DEFAULT_GLUTE_BRIDGE_PHASE_CONFIG,
  gluteBridgeDriveDeg,
} from "../phase.js";
import {
  countReps,
  initialRepCounterState,
  messageForRepReject,
  stepRep,
} from "../repCounter.js";
import type { Phase, Pose, Severity } from "../types.js";
import { GLUTE_BRIDGE_RULES, validate } from "../validate.js";
import { GLUTE_BRIDGE, GLUTE_BRIDGE_DEPTH_RULE_ID } from "./glute-bridge.js";

interface DocRule {
  id: string;
  toleranceDeg: number;
  phases: Phase[];
  severity: Severity;
  message: string;
}

const MD_PATH = fileURLToPath(
  new URL("../../../../docs/exercises/glute-bridge-rules.md", import.meta.url),
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
    if (id !== "hip-extension") continue;
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

const REST = buildGluteBridgePose({ hipDeg: 120 });
const MID = buildGluteBridgePose({ hipDeg: 150 });
const PEAK = buildGluteBridgePose({ hipDeg: 172 });
/** 侧摄常见「看起来已顶髋」、v0.2.1 应计入。 */
const USER_LOCKOUT = buildGluteBridgePose({ hipDeg: 145 });
/** 未跨过 bottom 线（drive 45 > 40）。 */
const SHALLOW_PEAK = buildGluteBridgePose({ hipDeg: 135 });
/** 强制 bottom 下应报 hip-extension。 */
const DEPTH_FAULT = buildGluteBridgePose({ hipDeg: 125 });

const gluteRepOpts = {
  phaseConfig: DEFAULT_GLUTE_BRIDGE_PHASE_CONFIG,
  rules: GLUTE_BRIDGE_RULES,
  angleFn: gluteBridgeDriveDeg,
  depthRuleId: GLUTE_BRIDGE_DEPTH_RULE_ID,
  exerciseId: "glute-bridge" as const,
};

describe("臀桥契约：glute-bridge.ts 与 glute-bridge-rules.md", () => {
  const md = readFileSync(MD_PATH, "utf8");
  const docRules = parseDocRules(md);

  it("只实现 hip-extension；lumbar-extension 为 P2 不入库", () => {
    expect(docRules.map((r) => r.id)).toEqual(["hip-extension"]);
    expect(GLUTE_BRIDGE.rules.map((r) => r.id)).toEqual(["hip-extension"]);
    expect(md).toMatch(/lumbar-extension/);
  });

  for (const doc of docRules) {
    it(`规则 ${doc.id}`, () => {
      const code = GLUTE_BRIDGE.rules.find((r) => r.id === doc.id);
      expect(code).toBeDefined();
      expect(code!.toleranceDeg).toBe(doc.toleranceDeg);
      expect(code!.severity).toBe(doc.severity);
      expect(code!.message).toBe(doc.message);
      expect([...code!.phases].sort()).toEqual([...doc.phases].sort());
    });
  }

  it("id/name/机位来自 frontmatter", () => {
    expect(GLUTE_BRIDGE.id).toBe("glute-bridge");
    expect(GLUTE_BRIDGE.name).toBe("臀桥");
    expect(GLUTE_BRIDGE.cameraHint).toBe("side");
  });

  it("相位阈值与 glute-bridge-rules 一致", () => {
    expect(GLUTE_BRIDGE.phaseThresholds.standAboveDeg).toBe(48);
    expect(GLUTE_BRIDGE.phaseThresholds.bottomBelowDeg).toBe(40);
    expect(GLUTE_BRIDGE.phaseThresholds.confirmFrames).toBe(5);
  });
});

describe("臀桥 hip-extension 单帧", () => {
  it("强制 bottom：髋伸 165°/145° 不报；125° 报 error", () => {
    const ok = validate(PEAK, "bottom", GLUTE_BRIDGE_RULES);
    expect(ok.status).toBe("correct");
    expect(ok.results.find((r) => r.id === "hip-extension")?.triggered).toBe(
      false,
    );

    const userLock = validate(USER_LOCKOUT, "bottom", GLUTE_BRIDGE_RULES);
    expect(userLock.status).toBe("correct");

    const bad = validate(DEPTH_FAULT, "bottom", GLUTE_BRIDGE_RULES);
    expect(bad.status).toBe("error");
    expect(bad.messages[0]).toMatch(/髋没顶够/);
  });

  it("stand 不评估 hip-extension", () => {
    const res = validate(DEPTH_FAULT, "stand", GLUTE_BRIDGE_RULES);
    expect(res.results).toHaveLength(0);
  });
});

describe("臀桥 rep 计数", () => {
  const oneCycle = (): Pose[] => [
    ...frames(REST, 6),
    ...frames(MID, 6),
    ...frames(PEAK, 6),
    ...frames(MID, 6),
    ...frames(REST, 6),
  ];

  it("完整顶髋计 1", () => {
    const state = countReps(oneCycle(), gluteRepOpts);
    expect(state.count).toBe(1);
    expect(state.reps[0]!.counted).toBe(true);
  });

  it("侧摄常见锁髋（髋伸 145°）计 1", () => {
    const seq = [
      ...frames(REST, 6),
      ...frames(MID, 6),
      ...frames(USER_LOCKOUT, 6),
      ...frames(MID, 6),
      ...frames(REST, 6),
    ];
    const state = countReps(seq, gluteRepOpts);
    expect(state.count).toBe(1);
    expect(state.reps[0]!.counted).toBe(true);
  });

  it("未进 bottom → shallow；文案来自 rules", () => {
    const seq = [
      ...frames(REST, 6),
      ...frames(SHALLOW_PEAK, 12),
      ...frames(REST, 6),
    ];
    const counted = countReps(seq, gluteRepOpts);
    expect(counted.count).toBe(0);
    expect(counted.reps.length).toBe(0);

    let saw: { type: string; reason?: string } | null = null;
    let state = initialRepCounterState();
    for (const p of seq) {
      state = stepRep(state, p, gluteRepOpts);
      if (state.lastOutcome) saw = state.lastOutcome;
    }
    expect(saw).toEqual({ type: "rejected", reason: "shallow" });
    expect(messageForRepReject("shallow", "glute-bridge")).toBe(
      "髋没顶够，未计入次数",
    );
    expect(messageForRepReject("depth_fault", "glute-bridge")).toBe(
      "髋没顶够，推到肩膝一线并收臀",
    );
  });
});
