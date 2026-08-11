#!/usr/bin/env node
/**
 * 示范轨迹离线提取 CLI（FR-067 / T7-1）
 *
 * 用法：
 *   pnpm --filter @fitness-coach/trajectory-extract extract -- synthesize --exercise squat
 *   pnpm --filter @fitness-coach/trajectory-extract extract -- from-dump --input dump.json --exercise squat
 *   pnpm --filter @fitness-coach/trajectory-extract generate:bundled
 *
 * 视频 → 姿态：先用外部/App 导出 PoseDump JSON，再 from-dump。
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  extractFromPoseDump,
  parseDemoTrajectory,
  synthesizeDemoTrajectory,
  synthesizePoseDump,
  type PoseDump,
  type TrajectoryExerciseId,
} from "@fitness-coach/core";

function usage(): never {
  console.error(`trajectory-extract

Commands:
  synthesize --exercise squat|pushup [--out dir] [--id id]
  synthesize --all --out dir
  from-dump --input pose-dump.json --exercise squat|pushup [--out dir] [--id id]
  dump-synthetic --exercise squat|pushup [--out file]   # 写出中间 PoseDump 样例
`);
  process.exit(1);
}

function argValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  return args[i + 1];
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

async function writeTrajectory(
  traj: ReturnType<typeof synthesizeDemoTrajectory>,
  outDir: string,
): Promise<string> {
  await mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `${traj.id}.json`);
  // 再 parse 一次确保落盘可被 core 加载
  const checked = parseDemoTrajectory(traj);
  await writeFile(file, `${JSON.stringify(checked, null, 2)}\n`, "utf8");
  return file;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (!cmd) usage();

  if (cmd === "synthesize") {
    const outDir =
      argValue(argv, "--out") ??
      path.resolve(process.cwd(), "../../packages/core/trajectories");
    if (hasFlag(argv, "--all")) {
      for (const ex of ["squat", "pushup"] as const) {
        const traj = synthesizeDemoTrajectory(ex);
        const file = await writeTrajectory(traj, outDir);
        console.log(`wrote ${file} frames=${traj.frames.length}`);
      }
      return;
    }
    const exercise = argValue(argv, "--exercise") as
      | TrajectoryExerciseId
      | undefined;
    if (exercise !== "squat" && exercise !== "pushup") usage();
    const id = argValue(argv, "--id");
    const traj = synthesizeDemoTrajectory(exercise, id ? { id } : undefined);
    const file = await writeTrajectory(traj, outDir);
    console.log(`wrote ${file} frames=${traj.frames.length}`);
    return;
  }

  if (cmd === "from-dump") {
    const input = argValue(argv, "--input");
    const exercise = argValue(argv, "--exercise") as
      | TrajectoryExerciseId
      | undefined;
    if (!input || (exercise !== "squat" && exercise !== "pushup")) usage();
    const outDir =
      argValue(argv, "--out") ??
      path.resolve(process.cwd(), "../../packages/core/trajectories");
    const id = argValue(argv, "--id") ?? `${exercise}-side-v1`;
    const dump = JSON.parse(await readFile(input, "utf8")) as PoseDump;
    const traj = extractFromPoseDump(dump, { exerciseId: exercise, id });
    const file = await writeTrajectory(traj, outDir);
    console.log(`wrote ${file} frames=${traj.frames.length}`);
    return;
  }

  if (cmd === "dump-synthetic") {
    const exercise = argValue(argv, "--exercise") as
      | TrajectoryExerciseId
      | undefined;
    if (exercise !== "squat" && exercise !== "pushup") usage();
    const out =
      argValue(argv, "--out") ??
      path.resolve(process.cwd(), `${exercise}-pose-dump.json`);
    const dump = synthesizePoseDump(exercise, 3);
    await writeFile(out, `${JSON.stringify(dump, null, 2)}\n`, "utf8");
    console.log(`wrote ${out} frames=${dump.frames.length}`);
    return;
  }

  usage();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
