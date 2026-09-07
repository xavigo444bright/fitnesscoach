import { readdir, stat } from "node:fs/promises";
import path from "node:path";

function isInboxMp4(file: string, scoutId: string): boolean {
  if (!file.endsWith(".mp4") && !file.endsWith(".MP4")) return false;
  return file === `${scoutId}.mp4` || file.startsWith(`${scoutId}-`);
}

/** `_inbox` 里该 scout-id 最新的全片（download-only 文件名：`<id>-<stamp>.mp4`）。 */
export async function findLatestInboxVideo(
  inboxDir: string,
  scoutId: string,
): Promise<string | null> {
  let names: string[];
  try {
    names = await readdir(inboxDir);
  } catch {
    return null;
  }
  const matches = names.filter((f) => isInboxMp4(f, scoutId));
  if (matches.length === 0) return null;
  const ranked = await Promise.all(
    matches.map(async (name) => {
      const full = path.join(inboxDir, name);
      const st = await stat(full);
      return { full, mtime: st.mtimeMs };
    }),
  );
  ranked.sort((a, b) => b.mtime - a.mtime);
  return ranked[0]?.full ?? null;
}
