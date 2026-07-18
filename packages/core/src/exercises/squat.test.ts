import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SQUAT } from "./squat.js";
import type { Phase, Severity } from "../types.js";

/** squat-rules.md 规则表解析出的一行。 */
interface DocRule {
  id: string;
  toleranceDeg: number;
  phases: Phase[];
  severity: Severity;
  message: string;
}

const MD_PATH = fileURLToPath(
  new URL("../../../../docs/exercises/squat-rules.md", import.meta.url),
);

function parseDocRules(md: string): DocRule[] {
  const lines = md.split("\n");
  const rules: DocRule[] = [];
  for (const line of lines) {
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    // 规则表行：第一格是已知规则 ID
    if (cells.length < 7) continue;
    const id = cells[0];
    if (!["squat-depth", "knee-valgus-l", "knee-valgus-r", "torso-upright"].includes(id))
      continue;
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

describe("VT-P1-006 squat.ts 与 squat-rules.md 契约一致", () => {
  const md = readFileSync(MD_PATH, "utf8");
  const docRules = parseDocRules(md);

  it("解析出 4 条文档规则", () => {
    expect(docRules.length).toBe(4);
  });

  it("规则 ID 集合一致", () => {
    const codeIds = SQUAT.rules.map((r) => r.id).sort();
    const docIds = docRules.map((r) => r.id).sort();
    expect(codeIds).toEqual(docIds);
  });

  for (const doc of parseDocRules(readFileSync(MD_PATH, "utf8"))) {
    describe(doc.id, () => {
      const code = SQUAT.rules.find((r) => r.id === doc.id)!;

      it("存在于 squat.ts", () => {
        expect(code).toBeTruthy();
      });

      it("容差一致", () => {
        expect(code.toleranceDeg).toBe(doc.toleranceDeg);
      });

      it("严重度一致", () => {
        expect(code.severity).toBe(doc.severity);
      });

      it("生效相位一致", () => {
        expect([...code.phases].sort()).toEqual([...doc.phases].sort());
      });

      it("提示文案一致", () => {
        expect(code.message).toBe(doc.message);
      });
    });
  }
});

describe("SQUAT 动作元数据", () => {
  it("id/name/机位来自 squat-rules.md frontmatter", () => {
    expect(SQUAT.id).toBe("squat");
    expect(SQUAT.name).toBe("深蹲");
    expect(SQUAT.cameraHint).toBe("side");
  });

  it("相位阈值与状态机默认一致", () => {
    expect(SQUAT.phaseThresholds.standAboveDeg).toBe(160);
    expect(SQUAT.phaseThresholds.bottomBelowDeg).toBe(100);
    expect(SQUAT.phaseThresholds.confirmFrames).toBe(5);
  });
});
