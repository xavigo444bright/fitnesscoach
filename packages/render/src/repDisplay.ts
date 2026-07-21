/**
 * Rep 计数 → UI 展示数据（M3-T7，VT-P3B-003/004）
 *
 * 业务计数仍在 @fitness-coach/core 的 stepRep/countReps；
 * 本模块只映射为 CMP-005 RepCounter 可消费的纯数据。
 */

import type { RepCounterState } from "@fitness-coach/core";

export interface RepDisplay {
  /** 已计入的有效次数（深度不足不计入）。 */
  count: number;
  /** 最近一次结算是否计入；尚无结算则为 null。 */
  lastCounted: boolean | null;
}

export function repDisplayFromState(state: RepCounterState): RepDisplay {
  const last = state.reps.length > 0 ? state.reps[state.reps.length - 1]! : null;
  return {
    count: state.count,
    lastCounted: last ? last.counted : null,
  };
}
