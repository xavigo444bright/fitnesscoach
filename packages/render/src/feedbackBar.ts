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

/** 按动作覆盖 recovered 文案，避免划船打出深蹲句。 */
export function recoverMessageByIdFor(
  exerciseId: string,
): Record<string, string> {
  const base = DEFAULT_FEEDBACK_BAR_CONFIG.recoverMessageById;
  if (exerciseId === "db-row") {
    return {
      ...base,
      "rep-shallow": "很好，拉得更高了",
      "row-depth": "很好，拉得更高了",
    };
  }
  if (exerciseId === "pushup") {
    return {
      ...base,
      "rep-shallow": "很好，降得更低了",
      "elbow-depth": "很好，降得更低了",
      "body-line": "很好，身体更直了",
    };
  }
  if (exerciseId === "ohp") {
    return {
      ...base,
      "rep-shallow": "很好，推得更直了",
      "torso-upright": "很好，躯干更稳了",
    };
  }
  if (exerciseId === "bench-press") {
    return {
      ...base,
      "rep-shallow": "很好，放到胸口了",
      "elbow-depth": "很好，放到胸口了",
    };
  }
  if (exerciseId === "glute-bridge") {
    return {
      ...base,
      "rep-shallow": "很好，髋顶得更高了",
    };
  }
  if (exerciseId === "lunge") {
    return {
      ...base,
      "rep-shallow": "很好，蹲得更深了",
    };
  }
  if (exerciseId === "plank") {
    return {
      ...base,
      "rep-shallow": "很好，撑住了",
      "body-line": "很好，腰放平了",
    };
  }
  if (exerciseId === "rdl") {
    return {
      ...base,
      "rep-shallow": "很好，铰链更深了",
      "rdl-depth": "很好，铰链更深了",
    };
  }
  if (exerciseId === "pullup") {
    return {
      ...base,
      "rep-shallow": "很好，拉得更高了",
      "pull-depth": "很好，拉得更高了",
    };
  }
  if (exerciseId === "db-fly") {
    return {
      ...base,
      "rep-shallow": "很好，打开得更开了",
      "fly-depth": "很好，打开得更开了",
    };
  }
  if (exerciseId === "dip") {
    return {
      ...base,
      "rep-shallow": "很好，降得更低了",
      "dip-depth": "很好，降得更低了",
      "torso-lean": "很好，前倾练胸了",
    };
  }
  if (exerciseId === "incline-pushup") {
    return {
      ...base,
      "rep-shallow": "很好，降得更低了",
      "elbow-depth": "很好，降得更低了",
      "body-line": "很好，身体一条线了",
    };
  }
  if (exerciseId === "cable-crossover") {
    return {
      ...base,
      "rep-shallow": "很好，打开得更开了",
      "crossover-depth": "很好，打开得更开了",
    };
  }
  if (exerciseId === "chest-press-machine") {
    return {
      ...base,
      "rep-shallow": "很好，收得更近了",
      "press-depth": "很好，收得更近了",
    };
  }
  if (exerciseId === "lateral-raise" || exerciseId === "front-raise") {
    return {
      ...base,
      "rep-shallow": "很好，抬得更高了",
      "raise-height": "很好，抬得更高了",
    };
  }
  if (exerciseId === "rear-delt-fly") {
    return {
      ...base,
      "rep-shallow": "很好，打开得更开了",
      "fly-depth": "很好，打开得更开了",
    };
  }
  if (exerciseId === "face-pull") {
    return {
      ...base,
      "rep-shallow": "很好，拉得更近了",
      "pull-height": "很好，拉得更近了",
    };
  }
  if (exerciseId === "pike-pushup") {
    return {
      ...base,
      "rep-shallow": "很好，降得更低了",
      "elbow-depth": "很好，降得更低了",
      "pike-line": "很好，倒 V 稳住了",
    };
  }
  return base;
}

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
