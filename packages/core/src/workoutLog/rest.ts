/** FR-096：组间剩余秒。Screen 只负责按墙钟刷新。 */

export const DEFAULT_REST_SEC = 90;

export function restRemainingSec(
  durationSec: number,
  startedAtMs: number,
  nowMs: number,
): number {
  if (!(durationSec > 0)) return 0;
  const elapsed = Math.floor((nowMs - startedAtMs) / 1000);
  return Math.max(0, durationSec - elapsed);
}
