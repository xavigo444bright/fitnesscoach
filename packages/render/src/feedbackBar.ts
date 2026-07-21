/**
 * FeedbackBar 数据层：优先级 + 最多 2 条 + recovered（M3-T3 / VT-P3A-003 / FR-045）
 *
 * 输入为「当前应展示的纠错线索」（T4 再接 pushFeedback 防抖冷却）。
 */

export type FeedbackSeverity = "error" | "warning" | "correct";

export interface FeedbackBarCue {
  id: string;
  severity: "error" | "warning";
  message: string;
}

export interface FeedbackBarItem {
  ruleId: string;
  message: string;
  severity: FeedbackSeverity;
  phase: "correcting" | "recovered";
}

export interface FeedbackBarConfig {
  maxItems: number;
  recoveredMs: number;
  /** 规则改正后的正反馈文案；缺省用通用句。 */
  recoverMessageById: Record<string, string>;
}

export const DEFAULT_FEEDBACK_BAR_CONFIG: FeedbackBarConfig = {
  maxItems: 2,
  recoveredMs: 1800,
  recoverMessageById: {
    "knee-valgus-l": "很好，膝盖稳住了",
    "knee-valgus-r": "很好，膝盖稳住了",
    "squat-depth": "很好，蹲得更深了",
    "rep-shallow": "很好，蹲得更深了",
    "torso-upright": "很好，躯干更稳了",
  },
};

const SEV_RANK: Record<"error" | "warning", number> = {
  error: 2,
  warning: 1,
};

interface Recovering {
  id: string;
  message: string;
  untilMs: number;
}

export interface FeedbackBarState {
  /** 上一帧仍处于 correcting 的规则 ID。 */
  prevCorrectingIds: string[];
  recovering: Recovering[];
}

export function initialFeedbackBarState(): FeedbackBarState {
  return { prevCorrectingIds: [], recovering: [] };
}

function sortCues(cues: FeedbackBarCue[]): FeedbackBarCue[] {
  return [...cues].sort((a, b) => {
    const d = SEV_RANK[b.severity] - SEV_RANK[a.severity];
    if (d !== 0) return d;
    return a.id.localeCompare(b.id);
  });
}

/**
 * 推进一帧：从 active cues 生成 ≤maxItems 的展示项，并处理 recovered。
 */
export function stepFeedbackBar(
  state: FeedbackBarState,
  activeCues: FeedbackBarCue[],
  nowMs: number,
  cfg: FeedbackBarConfig = DEFAULT_FEEDBACK_BAR_CONFIG,
): { state: FeedbackBarState; items: FeedbackBarItem[] } {
  const sorted = sortCues(activeCues);
  const top = sorted.slice(0, cfg.maxItems);
  const activeIds = new Set(top.map((c) => c.id));

  // 上一帧有、本帧 top 中没有 → 进入 recovered
  const recovering = state.recovering.filter((r) => r.untilMs > nowMs);
  for (const id of state.prevCorrectingIds) {
    if (activeIds.has(id)) continue;
    if (recovering.some((r) => r.id === id)) continue;
    recovering.push({
      id,
      message: cfg.recoverMessageById[id] ?? "很好，动作改善了",
      untilMs: nowMs + cfg.recoveredMs,
    });
  }

  // 若某规则又错了，取消其 recovered
  const recoveringAlive = recovering.filter((r) => !activeIds.has(r.id));

  const items: FeedbackBarItem[] = [];
  for (const c of top) {
    items.push({
      ruleId: c.id,
      message: c.message,
      severity: c.severity,
      phase: "correcting",
    });
  }
  for (const r of recoveringAlive) {
    if (items.length >= cfg.maxItems) break;
    // 不与 correcting 抢同 ID（已 filter）
    if (items.some((i) => i.ruleId === r.id)) continue;
    items.push({
      ruleId: r.id,
      message: r.message,
      severity: "correct",
      phase: "recovered",
    });
  }

  // 仍截断到 maxItems（correcting 已优先占位）
  const capped = items.slice(0, cfg.maxItems);

  return {
    state: {
      prevCorrectingIds: top.map((c) => c.id),
      recovering: recoveringAlive,
    },
    items: capped,
  };
}

/** 从 validate 结果抽 active cues（未防抖；T4 可改喂 FeedbackCue）。 */
export function cuesFromValidation(validation: {
  results: Array<{
    id: string;
    triggered: boolean;
    severity: "error" | "warning";
    message: string;
  }>;
}): FeedbackBarCue[] {
  return validation.results
    .filter((r) => r.triggered)
    .map((r) => ({
      id: r.id,
      severity: r.severity,
      message: r.message,
    }));
}
