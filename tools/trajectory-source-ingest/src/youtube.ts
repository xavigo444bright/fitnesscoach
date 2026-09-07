/**
 * YouTube 检索 / 探活走 yt-dlp，不要 WebFetch watch 页（会让用户逐条点允许）。
 */

import { runYtDlp } from "./download.js";

export interface YoutubeSearchHit {
  id: string;
  title: string;
  durationSec: number | null;
  url: string;
  channel?: string;
}

export interface YoutubeProbe {
  id: string | null;
  title: string;
  durationSec: number | null;
  channel?: string;
  url: string;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function asDuration(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function youtubeSearch(
  query: string,
  maxResults = 8,
): Promise<YoutubeSearchHit[]> {
  const n = Math.min(20, Math.max(1, Math.floor(maxResults)));
  const r = await runYtDlp(
    [
      "--flat-playlist",
      "--skip-download",
      "--no-warnings",
      "-J",
      `ytsearch${n}:${query}`,
    ],
    90_000,
  );
  if (r.code !== 0) {
    throw new Error(
      `yt-dlp search failed: ${(r.stderr || r.stdout).slice(0, 600)}`,
    );
  }
  const parsed = JSON.parse(r.stdout) as {
    entries?: Array<Record<string, unknown>>;
  };
  const hits: YoutubeSearchHit[] = [];
  for (const e of parsed.entries ?? []) {
    const id = asString(e.id);
    if (!id) continue;
    hits.push({
      id,
      title: asString(e.title) ?? id,
      durationSec: asDuration(e.duration),
      url: asString(e.url) ?? `https://www.youtube.com/watch?v=${id}`,
      channel: asString(e.channel) ?? asString(e.uploader),
    });
  }
  return hits;
}

export async function youtubeProbe(url: string): Promise<YoutubeProbe> {
  const r = await runYtDlp(
    ["--skip-download", "--no-playlist", "--no-warnings", "-J", url],
    90_000,
  );
  if (r.code !== 0) {
    throw new Error(
      `yt-dlp probe failed: ${(r.stderr || r.stdout).slice(0, 600)}`,
    );
  }
  const e = JSON.parse(r.stdout) as Record<string, unknown>;
  const id = asString(e.id) ?? null;
  return {
    id,
    title: asString(e.title) ?? url,
    durationSec: asDuration(e.duration),
    channel: asString(e.channel) ?? asString(e.uploader),
    url,
  };
}
