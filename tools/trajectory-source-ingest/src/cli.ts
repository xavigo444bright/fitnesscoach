#!/usr/bin/env node
/**
 * 示范片源 ingest CLI（FR-067 片源侧）
 *
 * 用法：
 *   pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
 *     --url https://example.com/demo.mp4 --exercise squat --camera side \
 *     --license "CC-BY-4.0 author…"
 *
 *   pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- --dry-run --exercise squat
 *
 * 默认不覆盖 packages/core/trajectories 正式轨迹 JSON。
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import type { PoseDump } from "@fitness-coach/core";
import { resolveOrDownloadVideo } from "./download.js";
import { dryRunPoseDump } from "./fixture.js";
import { cropCandidateClip } from "./crop.js";
import { exerciseDirs } from "./paths.js";
import { runVideoToPoseDump } from "./pose.js";
import { nextStepHint, writeIngestReport } from "./report.js";
import { selectCandidateWindows } from "./score.js";
import type {
  CameraHint,
  ExerciseId,
  IngestReport,
  Provenance,
} from "./types.js";
import { argValue, hasFlag, toolVersion } from "./util.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { name: string; version: string };

function usage(): never {
  console.error(`trajectory-source-ingest

Usage:
  ingest --url <http(s)|local-path> --exercise squat|pushup
         [--camera side|front] [--license "..."] [--note "..."]
         [--max-candidates N] [--stride N] [--skip-crop]
  ingest --dry-run --exercise squat|pushup [--camera side|front]

Notes:
  - Downloads land in media/trajectory-source/<exercise>/_inbox/
  - Candidates + report in media/trajectory-source/<exercise>/_candidates/
  - Does NOT write packages/core/trajectories/*.json
  - Will not bypass DRM / login / paywall
`);
  process.exit(1);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    usage();
  }

  const dryRun = hasFlag(argv, "--dry-run");
  const exercise = argValue(argv, "--exercise") as ExerciseId | undefined;
  if (exercise !== "squat" && exercise !== "pushup") usage();

  const cameraFlag = argValue(argv, "--camera") as CameraHint | undefined;
  if (
    cameraFlag != null &&
    cameraFlag !== "side" &&
    cameraFlag !== "front"
  ) {
    usage();
  }

  const licenseNote = argValue(argv, "--license");
  const note = argValue(argv, "--note");
  const maxCandidates = Number(argValue(argv, "--max-candidates") ?? "3");
  const stride = Number(argValue(argv, "--stride") ?? "1");
  const skipCrop = hasFlag(argv, "--skip-crop");
  const dirs = exerciseDirs(exercise);
  await mkdir(dirs.inbox, { recursive: true });
  await mkdir(dirs.candidates, { recursive: true });

  const fetchedAt = new Date().toISOString();
  const [ytDlpVersion, ffmpegVersion] = await Promise.all([
    toolVersion("yt-dlp"),
    toolVersion("ffmpeg", ["-version"]),
  ]);

  let sourceUrl: string;
  let localVideo: string | undefined;
  let poseDump: PoseDump;
  let poseDumpPath: string | undefined;
  let poseScript: string | null = null;
  let downloadMethod: string | undefined;

  if (dryRun) {
    sourceUrl = "dry-run://synthetic-pose-dump";
    poseDump = dryRunPoseDump(exercise, 12);
    poseDumpPath = path.join(
      dirs.inbox,
      `${exercise}-dry-run.pose.json`,
    );
    await writeFile(
      poseDumpPath,
      `${JSON.stringify(poseDump, null, 2)}\n`,
      "utf8",
    );
    console.log(`[dry-run] wrote synthetic PoseDump ${poseDumpPath}`);
  } else {
    const url = argValue(argv, "--url");
    if (!url) usage();
    sourceUrl = url;

    const dl = await resolveOrDownloadVideo({
      input: url,
      inboxDir: dirs.inbox,
      exerciseId: exercise,
    });
    localVideo = dl.localPath;
    downloadMethod = dl.method;
    console.log(`downloaded via ${dl.method}: ${localVideo}`);

    const cameraForPose = cameraFlag ?? "side";
    poseDumpPath = localVideo.replace(/\.[^.]+$/, "") + ".pose.json";
    const pose = await runVideoToPoseDump({
      videoPath: localVideo,
      exerciseId: exercise,
      camera: cameraForPose,
      outPath: poseDumpPath,
      stride: Number.isFinite(stride) && stride > 1 ? stride : undefined,
    });
    poseScript = pose.poseScript;
    poseDump = JSON.parse(await readFile(poseDumpPath, "utf8")) as PoseDump;
    console.log(`pose dump: ${poseDumpPath} frames=${poseDump.frames.length}`);
  }

  const scored = selectCandidateWindows(poseDump, {
    exerciseId: exercise,
    cameraHint: cameraFlag,
    maxCandidates: Number.isFinite(maxCandidates) ? maxCandidates : 3,
  });

  const provenance: Provenance = {
    sourceUrl,
    localPath: localVideo,
    fetchedAt,
    toolName: pkg.name,
    toolVersion: pkg.version,
    ytDlpVersion: ytDlpVersion,
    ffmpegVersion: ffmpegVersion,
    poseScript,
    note: [note, downloadMethod ? `download=${downloadMethod}` : null]
      .filter(Boolean)
      .join("; ") || undefined,
    licenseNote,
  };

  // 裁剪候选（dry-run / --skip-crop 跳过）
  if (!dryRun && !skipCrop && localVideo) {
    if (!ffmpegVersion) {
      console.warn(
        "ffmpeg not found; skipping crop. Re-run with ffmpeg installed or pass --skip-crop.",
      );
    } else {
      for (let i = 0; i < scored.candidates.length; i += 1) {
        const c = scored.candidates[i]!;
        const outMp4 = await cropCandidateClip({
          inputVideo: localVideo,
          outDir: dirs.candidates,
          exerciseId: exercise,
          cameraHint: c.cameraHint,
          index: i + 1,
          timeRange: c.timeRange,
        });
        c.outputMp4 = outMp4;
        console.log(
          `candidate ${i + 1}: ${outMp4} ` +
            `[${c.timeRange.startSec}-${c.timeRange.endSec}s] ` +
            `score=${c.score} reps≈${c.estimatedReps}`,
        );
      }
    }
  } else if (dryRun) {
    for (let i = 0; i < scored.candidates.length; i += 1) {
      const c = scored.candidates[i]!;
      c.outputMp4 = path.join(
        dirs.candidates,
        `${exercise}-${c.cameraHint}-cand-${String(i + 1).padStart(2, "0")}.mp4`,
      );
      c.reasons = [...c.reasons, "dry-run: 未实际裁剪 mp4"];
    }
  }

  const report: IngestReport = {
    schemaVersion: "1.0",
    exerciseId: exercise,
    provenance,
    cameraHint: scored.cameraHint,
    cameraHintSource: scored.cameraHintSource,
    videoDurationSec: Math.round(scored.durationSec * 1000) / 1000,
    poseDumpPath,
    candidates: scored.candidates,
    rejected: scored.rejected.slice(0, 12),
    nextStepHint: nextStepHint(exercise, scored.cameraHint),
  };

  const stamp = fetchedAt.replace(/[:.]/g, "-").slice(0, 19);
  const reportPath = path.join(
    dirs.candidates,
    `${exercise}-ingest-report-${dryRun ? "dry-run" : stamp}.json`,
  );
  await writeIngestReport(report, reportPath);

  console.log(`report: ${reportPath}`);
  console.log(
    `selected=${report.candidates.length} rejected=${report.rejected.length} ` +
      `camera=${report.cameraHint}(${report.cameraHintSource}) ` +
      `duration=${report.videoDurationSec}s`,
  );
  console.log(report.nextStepHint);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
