import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { IngestReport } from "./types.js";

export async function writeIngestReport(
  report: IngestReport,
  outPath: string,
): Promise<string> {
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return outPath;
}

export function nextStepHint(exerciseId: string, cameraHint: string): string {
  return [
    "人工确认候选 mp4 符合样片标准后：",
    `1) 将选用片复制/重命名为 media/trajectory-source/${exerciseId}/${exerciseId}-${cameraHint}-NN.mp4`,
    `2) 用 tools/trajectory-extract 的 video_to_pose_dump.py 生成 PoseDump`,
    `3) pnpm --filter @fitness-coach/trajectory-extract extract -- from-dump --input <dump.json> --exercise ${exerciseId}`,
    "默认不要覆盖 packages/core/trajectories 正式 JSON，除非人工验收通过。",
  ].join(" ");
}
