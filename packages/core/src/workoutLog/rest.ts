/** FR-096：组间剩余秒。Screen 只负责按墙钟刷新。 */

export const DEFAULT_REST_SEC = 90;
/** 沙漏刻度。短于此时长的休息，沙子仍按这一格来画，方便往上拖。 */
export const REST_SAND_CAP_SEC = 300;
export const MAX_REST_SEC = 600;

export function clampRestSec(sec: number): number {
  if (!Number.isFinite(sec)) return 0;
  return Math.min(MAX_REST_SEC, Math.max(0, Math.round(sec)));
}

export function restRemainingSec(
  durationSec: number,
  startedAtMs: number,
  nowMs: number,
): number {
  if (!(durationSec > 0)) return 0;
  const elapsed = Math.floor((nowMs - startedAtMs) / 1000);
  return Math.max(0, durationSec - elapsed);
}

/** 沙漏满格对应的秒数：至少一格，不超过上限。 */
export function restSandCapacitySec(durationSec: number): number {
  const base = Number.isFinite(durationSec) ? Math.max(0, durationSec) : 0;
  return Math.min(MAX_REST_SEC, Math.max(REST_SAND_CAP_SEC, Math.ceil(base)));
}

/**
 * 手指在沙漏上的位置。fractionFromTop：0 在顶（满）、1 在底（空）。
 */
export function restRemainingFromSandFraction(
  fractionFromTop: number,
  capacitySec: number,
): number {
  const cap = restSandCapacitySec(capacitySec);
  const t = Number.isFinite(fractionFromTop)
    ? Math.min(1, Math.max(0, fractionFromTop))
    : 1;
  return clampRestSec((1 - t) * cap);
}

/** 把剩余秒改成 nextRemaining，墙钟起点不动。 */
export function restDurationForRemaining(
  startedAtMs: number,
  nowMs: number,
  remainingSec: number,
): number {
  const elapsed = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  return elapsed + clampRestSec(remainingSec);
}
