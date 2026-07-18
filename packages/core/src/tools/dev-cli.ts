/**
 * @fitness-coach/core — 最小调试 CLI（M1-T10，可选）
 *
 * 用途：不依赖摄像头/Web，直接喂内置夹具，打印 validate / phase / repCount，
 * 便于人肉核对规则引擎行为。
 *
 * 运行：pnpm --filter @fitness-coach/core build && node dist/tools/dev-cli.js
 *      或 npx tsx src/tools/dev-cli.ts
 */

import { squatKneeAngle, runPhaseSequence } from "../phase.js";
import { validate } from "../validate.js";
import { countReps } from "../repCounter.js";
import { FIXTURES } from "../fixtures/index.js";
import type { Phase } from "../types.js";

const SINGLE_PHASE: Record<string, Phase> = {
  "FX-SQUAT-STAND": "stand",
  "FX-SQUAT-BOTTOM-OK": "bottom",
  "FX-SQUAT-SHALLOW": "bottom",
  "FX-SQUAT-VALGUS-L": "bottom",
  "FX-SQUAT-LEAN": "descend",
};

export function runDevReport(log: (line: string) => void = console.log): void {
  log("=== fitness-coach core dev report ===");

  for (const [id, phase] of Object.entries(SINGLE_PHASE)) {
    const fx = FIXTURES[id];
    const pose = fx.pose!;
    const knee = squatKneeAngle(pose);
    const res = validate(pose, phase);
    const issues = res.results
      .filter((r) => r.triggered)
      .map((r) => r.id)
      .join(",");
    log(
      `${id.padEnd(20)} phase=${phase.padEnd(8)} knee=${
        knee != null ? knee.toFixed(1) : "?"
      }°  status=${res.status.padEnd(8)} issues=[${issues}]`,
    );
  }

  const seq = FIXTURES["FX-SEQ-5REPS"].sequence!;
  const transitions = runPhaseSequence(seq);
  const rep = countReps(seq);
  log("");
  log(`FX-SEQ-5REPS 相位转移: ${transitions.join(" → ")}`);
  log(
    `FX-SEQ-5REPS rep: count=${rep.count} reps=${rep.reps.length} ` +
      `counted=${rep.reps.filter((r) => r.counted).length}`,
  );
}

// 直接运行时执行（ESM 入口判断）
if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1]}`
) {
  runDevReport();
}
