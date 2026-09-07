#!/usr/bin/env node
/**
 * 示范片源 ingest CLI（FR-067 / FR-087）
 *
 * 必须绑 ASSET-SCOUT：
 *   pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
 *     --scout-id glute-bridge-side-01
 *
 * 授权由用户确认，本 CLI 不校验 license 文本 / status。
 * 默认不覆盖 packages/core/trajectories 正式轨迹 JSON。
 */

import { mkdir, readFile, writeFile, copyFile, access } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import type { PoseDump } from "@fitness-coach/core";
import { resolveOrDownloadVideo } from "./download.js";
import { dryRunPoseDump } from "./fixture.js";
import { cropCandidateClip } from "./crop.js";
import { findLatestInboxVideo } from "./inbox.js";
import { exerciseDirs } from "./paths.js";
import { runVideoToPoseDump } from "./pose.js";
import { nextStepHint, writeIngestReport } from "./report.js";
import {
  candidateFromLookWindow,
  selectCandidateWindows,
} from "./score.js";
import { isScoutCamera, poseCameraHint } from "./cameraPlanes.js";
import { estimateCameraMotionFromVideo } from "./cameraMotion.js";
import {
  assertScoutMatches,
  parseScoutIdList,
  requireScoutClip,
  resolveScoutUrl,
} from "./scout.js";
import type { CameraHint, IngestReport, Provenance, ScoutCamera } from "./types.js";
import { argValue, argValues, hasFlag, toolVersion } from "./util.js";
import { youtubeProbe, youtubeSearch } from "./youtube.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { name: string; version: string };

function usage(): never {
  console.error(`trajectory-source-ingest

Usage:
  ingest --scout-id <id[,id2,...]> [--url ...] [--exercise ...] [--camera side|front|three_quarter]
         [--license "..."] [--note "..."]
         [--max-candidates N] [--stride N] [--skip-crop] [--download-only] [--crop-only] [--pose-only]
  ingest --dry-run --scout-id squat-side-01 [--camera side|front|three_quarter]
  ingest --yt-search "query" [--max 8]
  ingest --yt-probe --scout-id <id[,id2,...]>
  ingest --check-camera-motion --scout-id <id[,id2,...]>

Notes:
  - --scout-id is required except --yt-search (docs/exercises/asset-scout/clips.json)
  - Comma-separated or repeated --scout-id = one authorized batch (one network grant)
  - Status/license is NOT gated here; the owner confirms authorization
  - --download-only: full video to _inbox, skip PoseDump/crop
  - --crop-only: cut verified look-window from _inbox; skip download and PoseDump
  - --pose-only: PoseDump cropped <exercise>/<id>.mp4 (skips cameraStability=moving)
  - --yt-search / --yt-probe: yt-dlp only; do not WebFetch youtube.com
  - --check-camera-motion: corner SAD on cropped <exercise>/<id>.mp4
  - Downloads land in media/trajectory-source/<exercise>/_inbox/
  - Does NOT write packages/core/trajectories/*.json
  - Will not bypass DRM / login / paywall
`);
  process.exit(1);
}

function isLoopScoredExercise(
  id: string,
): id is "squat" | "pushup" {
  return id === "squat" || id === "pushup";
}

async function ingestClip(argv: string[], scoutId: string): Promise<void> {
  const dryRun = hasFlag(argv, "--dry-run");
  const clip = requireScoutClip(scoutId);

  const exerciseFlag = argValue(argv, "--exercise");
  const cameraFlag = argValue(argv, "--camera") as ScoutCamera | undefined;
  const urlFlag = argValue(argv, "--url");
  if (cameraFlag != null && !isScoutCamera(cameraFlag)) {
    usage();
  }
  assertScoutMatches(clip, {
    exercise: exerciseFlag,
    camera: cameraFlag,
    url: urlFlag,
  });

  const exercise = clip.exerciseId;
  const camera: CameraHint = poseCameraHint(clip.camera);
  const sourceInput = resolveScoutUrl(urlFlag ?? clip.url);

  const licenseNote = argValue(argv, "--license");
  const note = argValue(argv, "--note");
  const maxCandidates = Number(argValue(argv, "--max-candidates") ?? "3");
  const stride = Number(argValue(argv, "--stride") ?? "1");
  const skipCrop = hasFlag(argv, "--skip-crop");
  const downloadOnly = hasFlag(argv, "--download-only");
  const cropOnly = hasFlag(argv, "--crop-only");
  const poseOnly = hasFlag(argv, "--pose-only");
  if (dryRun && downloadOnly) {
    console.error("error: --download-only cannot be used with --dry-run");
    process.exit(1);
  }
  if (dryRun && cropOnly) {
    console.error("error: --crop-only cannot be used with --dry-run");
    process.exit(1);
  }
  if (dryRun && poseOnly) {
    console.error("error: --pose-only cannot be used with --dry-run");
    process.exit(1);
  }
  const exclusive = [downloadOnly, cropOnly, poseOnly].filter(Boolean).length;
  if (exclusive > 1) {
    console.error(
      "error: --download-only, --crop-only, and --pose-only are mutually exclusive",
    );
    process.exit(1);
  }
  const dirs = exerciseDirs(exercise);
  await mkdir(dirs.inbox, { recursive: true });
  await mkdir(dirs.candidates, { recursive: true });
  await mkdir(dirs.root, { recursive: true });

  if (cropOnly) {
    if (clip.startSec == null || clip.endSec == null) {
      console.error(
        `error: --crop-only needs numeric startSec/endSec on scout ${clip.id}`,
      );
      process.exit(1);
    }
    const inboxVideo = await findLatestInboxVideo(dirs.inbox, clip.id);
    if (!inboxVideo) {
      console.error(
        `error: no _inbox mp4 for ${clip.id}; run --download-only first`,
      );
      process.exit(1);
    }
    const [ytDlpVersion, ffmpegVersion] = await Promise.all([
      toolVersion("yt-dlp"),
      toolVersion("ffmpeg", ["-version"]),
    ]);
    if (!ffmpegVersion) {
      console.error("error: ffmpeg not found (required for --crop-only)");
      process.exit(1);
    }
    const fetchedAt = new Date().toISOString();
    const timeRange = { startSec: clip.startSec, endSec: clip.endSec };
    const candidateMp4 = await cropCandidateClip({
      inputVideo: inboxVideo,
      outDir: dirs.candidates,
      exerciseId: exercise,
      cameraHint: camera,
      index: 1,
      timeRange,
      fileName: `${clip.id}.mp4`,
    });
    const formalMp4 = path.join(dirs.root, `${clip.id}.mp4`);
    await copyFile(candidateMp4, formalMp4);
    const stamp = fetchedAt.replace(/[:.]/g, "-").slice(0, 19);
    const reportPath = path.join(
      dirs.candidates,
      `${clip.id}-crop-${stamp}.json`,
    );
    const report: IngestReport = {
      schemaVersion: "1.0",
      exerciseId: exercise,
      provenance: {
        sourceUrl: sourceInput,
        localPath: inboxVideo,
        fetchedAt,
        toolName: pkg.name,
        toolVersion: pkg.version,
        ytDlpVersion,
        ffmpegVersion,
        scoutId: clip.id,
        note: [
          note,
          "crop-only: look-window from clips.json; skipped download and PoseDump",
        ]
          .filter(Boolean)
          .join("; "),
        licenseNote,
      },
      cameraHint: camera,
      cameraHintSource: "flag",
      videoDurationSec: timeRange.endSec - timeRange.startSec,
      candidates: [
        {
          timeRange,
          score: 1,
          breakdown: {
            duration: 1,
            reps: 0,
            standEnds: 0,
            armsDownStand: 0,
            visibility: 1,
            fullBody: 1,
            camera: 1,
          },
          estimatedReps: 0,
          cameraHint: camera,
          cameraHintSource: "flag",
          selected: true,
          reasons: [`scout ${clip.id} user-verified look-window`],
          outputMp4: candidateMp4,
        },
      ],
      rejected: [],
      nextStepHint:
        `crop-only：参考片 ${formalMp4}。下一步对该 mp4 跑 PoseDump / trajectory-extract，不要对未裁全片提轨迹。`,
    };
    await writeIngestReport(report, reportPath);
    console.log(`cropped ${clip.id}: ${formalMp4}`);
    console.log(
      `  window ${timeRange.startSec}-${timeRange.endSec}s from ${inboxVideo}`,
    );
    console.log(`report: ${reportPath}`);
    console.log(report.nextStepHint);
    return;
  }

  if (poseOnly) {
    if (clip.cameraStability === "moving") {
      console.log(
        `skip pose-only ${clip.id}: cameraStability=moving (not a 2D trajectory source)`,
      );
      return;
    }
    const formalMp4 = path.join(dirs.root, `${clip.id}.mp4`);
    try {
      await access(formalMp4);
    } catch {
      console.error(
        `error: --pose-only needs cropped ${formalMp4}; run --crop-only first`,
      );
      process.exit(1);
    }
    const fetchedAt = new Date().toISOString();
    const poseDumpPath = formalMp4.replace(/\.mp4$/i, ".pose.json");
    const pose = await runVideoToPoseDump({
      videoPath: formalMp4,
      exerciseId: exercise,
      camera,
      outPath: poseDumpPath,
      stride: Number.isFinite(stride) && stride > 1 ? stride : undefined,
    });
    const dump = JSON.parse(await readFile(poseDumpPath, "utf8")) as PoseDump;
    const stamp = fetchedAt.replace(/[:.]/g, "-").slice(0, 19);
    const reportPath = path.join(
      dirs.candidates,
      `${clip.id}-pose-${stamp}.json`,
    );
    const report: IngestReport = {
      schemaVersion: "1.0",
      exerciseId: exercise,
      provenance: {
        sourceUrl: sourceInput,
        localPath: formalMp4,
        fetchedAt,
        toolName: pkg.name,
        toolVersion: pkg.version,
        poseScript: pose.poseScript,
        scoutId: clip.id,
        note: [
          note,
          "pose-only: PoseDump from cropped look-window; skipped download",
        ]
          .filter(Boolean)
          .join("; "),
        licenseNote,
      },
      cameraHint: camera,
      cameraHintSource: "flag",
      videoDurationSec: 0,
      poseDumpPath,
      candidates: [],
      rejected: [],
      nextStepHint:
        `pose-only：${poseDumpPath} frames=${dump.frames.length}。下一步 trajectory-extract from-dump，不要对未裁全片提轨迹。`,
    };
    await writeIngestReport(report, reportPath);
    console.log(
      `pose-only ${clip.id}: ${poseDumpPath} frames=${dump.frames.length}`,
    );
    console.log(`report: ${reportPath}`);
    console.log(report.nextStepHint);
    return;
  }

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
    sourceUrl = `dry-run://synthetic-pose-dump?scout=${clip.id}`;
    const synthId = isLoopScoredExercise(exercise) ? exercise : "squat";
    poseDump = {
      ...dryRunPoseDump(synthId, 12),
      label: `dry-run-synthetic-${exercise}.mp4`,
      ...(isLoopScoredExercise(exercise) ? { exerciseId: exercise } : {}),
    };
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
    sourceUrl = sourceInput;

    const dl = await resolveOrDownloadVideo({
      input: sourceInput,
      inboxDir: dirs.inbox,
      exerciseId: exercise,
      fileStem: clip.id,
    });
    localVideo = dl.localPath;
    downloadMethod = dl.method;
    console.log(`downloaded via ${dl.method}: ${localVideo}`);

    if (downloadOnly) {
      const stamp = fetchedAt.replace(/[:.]/g, "-").slice(0, 19);
      const reportPath = path.join(
        dirs.candidates,
        `${clip.id}-fetch-${stamp}.json`,
      );
      const report: IngestReport = {
        schemaVersion: "1.0",
        exerciseId: exercise,
        provenance: {
          sourceUrl,
          localPath: localVideo,
          fetchedAt,
          toolName: pkg.name,
          toolVersion: pkg.version,
          ytDlpVersion: ytDlpVersion,
          ffmpegVersion: ffmpegVersion,
          scoutId: clip.id,
          note: [
            note,
            `download=${downloadMethod}`,
            "download-only: skipped PoseDump and crop",
          ]
            .filter(Boolean)
            .join("; "),
          licenseNote,
        },
        cameraHint: camera,
        cameraHintSource: "flag",
        videoDurationSec: 0,
        candidates: [],
        rejected: [],
        nextStepHint:
          "download-only：全片在 _inbox。按 asset-scout「行程可读」规则本地标定 start/end 后再 crop / PoseDump。不要用未核 look-window 裁。",
      };
      await writeIngestReport(report, reportPath);
      console.log(`report: ${reportPath}`);
      console.log(report.nextStepHint);
      return;
    }

    poseDumpPath = localVideo.replace(/\.[^.]+$/, "") + ".pose.json";
    const pose = await runVideoToPoseDump({
      videoPath: localVideo,
      exerciseId: exercise,
      camera,
      outPath: poseDumpPath,
      stride: Number.isFinite(stride) && stride > 1 ? stride : undefined,
    });
    poseScript = pose.poseScript;
    poseDump = JSON.parse(await readFile(poseDumpPath, "utf8")) as PoseDump;
    console.log(`pose dump: ${poseDumpPath} frames=${poseDump.frames.length}`);
  }

  const scored = isLoopScoredExercise(exercise)
    ? selectCandidateWindows(poseDump, {
        exerciseId: exercise,
        cameraHint: camera,
        maxCandidates: Number.isFinite(maxCandidates) ? maxCandidates : 3,
      })
    : candidateFromLookWindow(poseDump, {
        cameraHint: camera,
        startSec: clip.startSec,
        endSec: clip.endSec,
        reason: `scout ${clip.id} look-window（该动作尚无 squat/pushup 循环评分）`,
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
    scoutId: clip.id,
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

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    usage();
  }

  const ytQuery = argValue(argv, "--yt-search");
  if (ytQuery) {
    const max = Number(argValue(argv, "--max") ?? "8");
    const hits = await youtubeSearch(ytQuery, max);
    console.log(JSON.stringify(hits, null, 2));
    return;
  }

  let ids: string[];
  try {
    ids = parseScoutIdList(argValues(argv, "--scout-id"));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
  if (ids.length === 0) {
    console.error("error: --scout-id is required");
    usage();
  }

  if (hasFlag(argv, "--yt-probe")) {
    const out = [];
    for (const id of ids) {
      const clip = requireScoutClip(id);
      const probe = await youtubeProbe(resolveScoutUrl(clip.url));
      out.push({ scoutId: id, ...probe });
    }
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (hasFlag(argv, "--check-camera-motion")) {
    const out = [];
    for (const id of ids) {
      const clip = requireScoutClip(id);
      const mp4 = path.join(exerciseDirs(clip.exerciseId).root, `${clip.id}.mp4`);
      const report = await estimateCameraMotionFromVideo(mp4);
      out.push({ scoutId: id, video: mp4, ...report });
    }
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const dryRun = hasFlag(argv, "--dry-run");
  if (dryRun && ids.length > 1) {
    console.error("error: --dry-run only supports one --scout-id");
    process.exit(1);
  }

  for (const id of ids) {
    if (ids.length > 1) {
      console.log(`\n=== ${id} ===`);
    }
    await ingestClip(argv, id);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
