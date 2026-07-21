/**
 * 上一不标准 rep 的错误记忆（UX-008）
 *
 * - 半蹲/深度不足/本周期已确认的规则 → 写入 memory
 * - 用户可展开查看（站起后关节已变绿仍能回看原因）
 * - 下一次有效计入 rep 时，对 memory 中的问题给出 recovered 正反馈并清空
 */

export interface FaultIssue {
  id: string;
  message: string;
  severity: "error" | "warning";
}

export interface LastFaultState {
  /** 上一不标准周期固化的问题（供回看）。 */
  issues: FaultIssue[];
  /** 本周期进行中累积的已确认问题（结算时写入 issues）。 */
  cycleBuffer: FaultIssue[];
  /** 用户是否展开回看。 */
  reviewing: boolean;
}

export function initialLastFaultState(): LastFaultState {
  return { issues: [], cycleBuffer: [], reviewing: false };
}

function upsert(buf: FaultIssue[], issue: FaultIssue): FaultIssue[] {
  const i = buf.findIndex((x) => x.id === issue.id);
  if (i < 0) return [...buf, issue];
  const next = buf.slice();
  next[i] = issue;
  return next;
}

/** 离开 stand 进入下蹲：清空本周期缓冲。 */
export function beginFaultCycle(state: LastFaultState): LastFaultState {
  return { ...state, cycleBuffer: [] };
}

/** 本周期内已确认的纠错线索（防抖后）写入缓冲。 */
export function noteCycleFaults(
  state: LastFaultState,
  issues: FaultIssue[],
): LastFaultState {
  let buf = state.cycleBuffer;
  for (const issue of issues) {
    buf = upsert(buf, issue);
  }
  return { ...state, cycleBuffer: buf };
}

/**
 * 周期被拒绝（半蹲/深度不足）：固化 memory。
 * 若缓冲为空，用 fallback（如 rep-shallow 文案）。
 */
export function sealRejectedCycle(
  state: LastFaultState,
  fallback?: FaultIssue | null,
): LastFaultState {
  const issues =
    state.cycleBuffer.length > 0
      ? state.cycleBuffer.slice(0, 2)
      : fallback
        ? [fallback]
        : [];
  return {
    issues,
    cycleBuffer: [],
    reviewing: false,
  };
}

/** 有效 rep 计入：若有上一问题，返回 recovered 文案并清空 memory。 */
export function celebrateFixedFaults(
  state: LastFaultState,
  recoverMessageById: Record<string, string>,
): {
  state: LastFaultState;
  recovered: Array<{ id: string; message: string }>;
} {
  if (state.issues.length === 0) {
    return {
      state: { ...state, cycleBuffer: [], reviewing: false },
      recovered: [],
    };
  }
  const recovered = state.issues.map((iss) => ({
    id: iss.id,
    message: recoverMessageById[iss.id] ?? "很好，动作改善了",
  }));
  return {
    state: { issues: [], cycleBuffer: [], reviewing: false },
    recovered,
  };
}

export function toggleFaultReview(state: LastFaultState): LastFaultState {
  if (state.issues.length === 0) {
    return { ...state, reviewing: false };
  }
  return { ...state, reviewing: !state.reviewing };
}

export function dismissFaultReview(state: LastFaultState): LastFaultState {
  return { ...state, reviewing: false };
}
