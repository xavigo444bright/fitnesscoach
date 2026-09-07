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
        "--scout-id",
        "squat-side-01",
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
    expect(report.provenance.scoutId).toBe("squat-side-01");
    expect(report.provenance.licenseNote).toMatch(/dry-run/i);
    expect(report.provenance.toolName).toBe(
      "@fitness-coach/trajectory-source-ingest",
    );
    expect(report.candidates.length).toBeGreaterThanOrEqual(1);
    expect(report.nextStepHint).toMatch(/trajectory-extract/);
  }, 60_000);

  it("没有 --scout-id 时拒绝运行", () => {
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
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: process.env,
      },
    );
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}\n${r.stderr}`).toMatch(/--scout-id is required/);
  }, 60_000);

  it("--dry-run 拒绝逗号分隔的多条 scout-id", () => {
    const r = spawnSync(
      "pnpm",
      [
        "--filter",
        "@fitness-coach/trajectory-source-ingest",
        "ingest",
        "--",
        "--dry-run",
        "--scout-id",
        "squat-side-01,squat-front-01",
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: process.env,
      },
    );
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}\n${r.stderr}`).toMatch(/only supports one --scout-id/);
  }, 60_000);

  it("--download-only 对本地 scout 只复制全片、不写 PoseDump", async () => {
    const r = spawnSync(
      "pnpm",
      [
        "--filter",
        "@fitness-coach/trajectory-source-ingest",
        "ingest",
        "--",
        "--download-only",
        "--scout-id",
        "squat-side-01",
        "--license",
        "owner-confirmed local copy test",
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: process.env,
      },
    );
    expect(r.status, r.stderr || r.stdout).toBe(0);
    expect(r.stdout).toMatch(/download-only/);
    const reportMatch = r.stdout.match(/report: (.+\.json)/);
    expect(reportMatch).toBeTruthy();
    const reportPath = reportMatch![1]!;
    const report = JSON.parse(await readFile(reportPath, "utf8")) as IngestReport;
    expect(report.provenance.scoutId).toBe("squat-side-01");
    expect(report.candidates).toEqual([]);
    expect(report.poseDumpPath).toBeUndefined();
    if (report.provenance.localPath) {
      await rm(report.provenance.localPath, { force: true });
    }
    await rm(reportPath, { force: true });
  }, 60_000);

  it("--crop-only 拒绝没有 look-window 的 ingested 片", () => {
    const r = spawnSync(
      "pnpm",
      [
        "--filter",
        "@fitness-coach/trajectory-source-ingest",
        "ingest",
        "--",
        "--crop-only",
        "--scout-id",
        "squat-side-01",
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: process.env,
      },
    );
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}\n${r.stderr}`).toMatch(/numeric startSec\/endSec/);
  }, 60_000);

  it("--pose-only 跳过 cameraStability=moving 的片", () => {
    const r = spawnSync(
      "pnpm",
      [
        "--filter",
        "@fitness-coach/trajectory-source-ingest",
        "ingest",
        "--",
        "--pose-only",
        "--scout-id",
        "dip-front-01",
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: process.env,
      },
    );
    expect(r.status, r.stderr || r.stdout).toBe(0);
    expect(r.stdout).toMatch(/skip pose-only dip-front-01/);
  }, 60_000);
});
