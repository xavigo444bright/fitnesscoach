import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "./paths.js";
import type { IngestReport } from "./types.js";

describe("trajectory-source-ingest CLI dry-run", () => {
  it("pnpm ingest --dry-run 写出评分报告且不依赖外网", async () => {
    const reportPath = path.join(
      REPO_ROOT,
      "media/trajectory-source/squat/_candidates/squat-ingest-report-dry-run.json",
    );
    await rm(reportPath, { force: true });

    const r = spawnSync(
      "pnpm",
      [
        "--filter",
        "@fitness-coach/trajectory-source-ingest",
        "ingest",
        "--",
        "--dry-run",
        "--exercise",
        "squat",
        "--camera",
        "side",
        "--license",
        "dry-run fixture (not a commercial source)",
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: process.env,
      },
    );

    expect(r.status, r.stderr || r.stdout).toBe(0);

    const report = JSON.parse(await readFile(reportPath, "utf8")) as IngestReport;
    expect(report.schemaVersion).toBe("1.0");
    expect(report.exerciseId).toBe("squat");
    expect(report.provenance.sourceUrl).toContain("dry-run");
    expect(report.provenance.licenseNote).toMatch(/dry-run/i);
    expect(report.provenance.toolName).toBe(
      "@fitness-coach/trajectory-source-ingest",
    );
    expect(report.candidates.length).toBeGreaterThanOrEqual(1);
    expect(report.nextStepHint).toMatch(/trajectory-extract/);
  }, 60_000);
});
