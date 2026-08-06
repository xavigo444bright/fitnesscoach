import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Phase, Severity } from "../types.js";
import { PUSHUP } from "./pushup.js";

interface DocRule {
  id: string;
  toleranceDeg: number;
  phases: Phase[];
  severity: Severity;
  message: string;
}

const MD_PATH = fileURLToPath(
  new URL("../../../../docs/exercises/pushup-rules.md", import.meta.url),
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
    if (!["elbow-depth", "body-line"].includes(id)) continue;
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

describe("VT-P6-001 pushup.ts 与 pushup-rules.md 契约一致", () => {
  const md = readFileSync(MD_PATH, "utf8");
  const docRules = parseDocRules(md);

  it("解析出 2 条文档规则", () => {
    expect(docRules.map((r) => r.id).sort()).toEqual(
      ["body-line", "elbow-depth"].sort(),
    );
  });

  for (const doc of docRules) {
    it(`规则 ${doc.id}`, () => {
      const code = PUSHUP.rules.find((r) => r.id === doc.id);
      expect(code).toBeDefined();
      expect(code!.toleranceDeg).toBe(doc.toleranceDeg);
      expect(code!.severity).toBe(doc.severity);
      expect(code!.message).toBe(doc.message);
      expect([...code!.phases].sort()).toEqual([...doc.phases].sort());
    });
  }

  it("id/name/机位来自 frontmatter", () => {
    expect(PUSHUP.id).toBe("pushup");
    expect(PUSHUP.name).toBe("俯卧撑");
    expect(PUSHUP.cameraHint).toBe("side");
  });

  it("相位阈值与 pushup-rules 一致", () => {
    expect(PUSHUP.phaseThresholds.standAboveDeg).toBe(160);
    expect(PUSHUP.phaseThresholds.bottomBelowDeg).toBe(120);
    expect(PUSHUP.phaseThresholds.confirmFrames).toBe(5);
  });
});
