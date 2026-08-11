/**
 * 片源下载：优先 yt-dlp；直链 mp4/http 用 curl。
 * 不绕过 DRM / 登录墙 / 付费墙。
 */

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { access } from "node:fs/promises";
import {
  isHttpUrl,
  looksLikeDirectVideoUrl,
  runCapture,
  slugFromUrlOrPath,
} from "./util.js";

export interface DownloadResult {
  localPath: string;
  method: "local-copy" | "yt-dlp" | "curl";
  ytDlpVersion?: string | null;
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

const DRM_HINT =
  /DRM|login required|Sign in|age.?restrict|premium|members.?only|Private video|HTTP Error 403|HTTP Error 401|This video is not available/i;

export async function resolveOrDownloadVideo(opts: {
  input: string;
  inboxDir: string;
  exerciseId: string;
}): Promise<DownloadResult> {
  await mkdir(opts.inboxDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const slug = slugFromUrlOrPath(opts.input);

  if (!isHttpUrl(opts.input)) {
    const abs = path.resolve(opts.input);
    if (!(await exists(abs))) {
      throw new Error(`local video not found: ${abs}`);
    }
    const ext = path.extname(abs) || ".mp4";
    const dest = path.join(
      opts.inboxDir,
      `${opts.exerciseId}-${slug}-${stamp}${ext}`,
    );
    await copyFile(abs, dest);
    return { localPath: dest, method: "local-copy" };
  }

  if (looksLikeDirectVideoUrl(opts.input)) {
    const ext = path.extname(new URL(opts.input).pathname) || ".mp4";
    const dest = path.join(
      opts.inboxDir,
      `${opts.exerciseId}-${slug}-${stamp}${ext}`,
    );
    const r = await runCapture(
      "curl",
      ["-L", "--fail", "--retry", "2", "-o", dest, opts.input],
      { timeoutMs: 600_000 },
    );
    if (r.code !== 0) {
      const combined = `${r.stdout}\n${r.stderr}`;
      if (DRM_HINT.test(combined)) {
        throw new Error(
          `download refused (auth/DRM/paywall suspected): ${combined.slice(0, 400)}`,
        );
      }
      throw new Error(`curl failed: ${combined.slice(0, 600)}`);
    }
    return { localPath: dest, method: "curl" };
  }

  // yt-dlp：不传 cookies / 不尝试破解；失败信息含登录/DRM 则明确拒绝
  const outTpl = path.join(
    opts.inboxDir,
    `${opts.exerciseId}-${slug}-${stamp}.%(ext)s`,
  );
  const ver = await runCapture("yt-dlp", ["--version"], { timeoutMs: 10_000 });
  if (ver.code !== 0) {
    throw new Error(
      "yt-dlp not found. Install yt-dlp, or pass a local path / direct .mp4 URL.",
    );
  }
  const r = await runCapture(
    "yt-dlp",
    [
      "--no-playlist",
      "--no-warnings",
      "-f",
      "mp4/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      "--merge-output-format",
      "mp4",
      "-o",
      outTpl,
      "--print",
      "after_move:filepath",
      opts.input,
    ],
    { timeoutMs: 900_000 },
  );
  const combined = `${r.stdout}\n${r.stderr}`;
  if (r.code !== 0) {
    if (DRM_HINT.test(combined)) {
      throw new Error(
        `download refused (auth/DRM/paywall suspected). Do not bypass. Detail: ${combined.slice(0, 500)}`,
      );
    }
    throw new Error(`yt-dlp failed: ${combined.slice(0, 800)}`);
  }
  const lines = r.stdout
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const localPath = lines[lines.length - 1];
  if (!localPath || !(await exists(localPath))) {
    throw new Error(
      `yt-dlp finished but output file missing. stdout=${r.stdout.slice(0, 400)}`,
    );
  }
  return {
    localPath,
    method: "yt-dlp",
    ytDlpVersion: ver.stdout.trim() || null,
  };
}
