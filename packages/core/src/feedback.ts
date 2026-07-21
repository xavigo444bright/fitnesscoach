/**
 * @fitness-coach/core — 反馈防抖 / 冷却（M1-T8，VT-P1-007/008）
 *
 * 防抖：某错误需持续 debounceMs 才「确认」触发（滤掉抖动/单帧误检）。
 * 冷却：同一错误确认后 cooldownMs 内不重复播报。
 * 用注入时钟（传入 now）做纯函数式时间模拟，便于单测。
 */

import type { RuleResult, ValidationResult } from "./types.js";

export interface FeedbackConfig {
  /** 持续多久才确认触发（毫秒）。 */
  debounceMs: number;
  /** 确认后多久内不重复播报（毫秒）。 */
  cooldownMs: number;
}

export const DEFAULT_FEEDBACK_CONFIG: FeedbackConfig = {
  /** 缓冲：需持续约 0.8s 才确认，避免边缘抖动频繁红字。 */
  debounceMs: 800,
  /** 确认后 3s 内不重复同规则播报。 */
  cooldownMs: 3000,
};

interface RuleTrack {
  /** 当前连续触发的起始时间；未触发为 null。 */
  activeSince: number | null;
  /** 上次「确认并播报」的时间；从未播报为 null。 */
  lastFiredAt: number | null;
}

export interface FeedbackState {
  tracks: Record<string, RuleTrack>;
}

export function initialFeedbackState(): FeedbackState {
  return { tracks: {} };
}

/** 本帧应播报的一条反馈。 */
export interface FeedbackCue {
  id: string;
  severity: RuleResult["severity"];
  message: string;
}

function getTrack(state: FeedbackState, id: string): RuleTrack {
  if (!state.tracks[id]) {
    state.tracks[id] = { activeSince: null, lastFiredAt: null };
  }
  return state.tracks[id];
}

/**
 * 处理一帧 validate 结果，返回本帧应「新播报」的反馈（经过防抖+冷却）。
 * 会就地更新 state。
 */
export function pushFeedback(
  state: FeedbackState,
  validation: ValidationResult,
  now: number,
  cfg: FeedbackConfig = DEFAULT_FEEDBACK_CONFIG,
): FeedbackCue[] {
  const cues: FeedbackCue[] = [];
  const triggeredById = new Map<string, RuleResult>();
  for (const r of validation.results) {
    if (r.triggered) triggeredById.set(r.id, r);
  }

  // 遍历所有已知规则轨道 + 本帧触发的规则
  const ids = new Set<string>([
    ...Object.keys(state.tracks),
    ...triggeredById.keys(),
  ]);

  for (const id of ids) {
    const track = getTrack(state, id);
    const hit = triggeredById.get(id);

    if (!hit) {
      // 本帧未触发：清空持续计时（冷却记录保留）
      track.activeSince = null;
      continue;
    }

    // 本帧触发：开始/延续持续计时
    if (track.activeSince == null) {
      track.activeSince = now;
    }

    const heldMs = now - track.activeSince;
    if (heldMs < cfg.debounceMs) {
      // 防抖未满，不播报
      continue;
    }

    // 已确认：检查冷却
    if (
      track.lastFiredAt != null &&
      now - track.lastFiredAt < cfg.cooldownMs
    ) {
      continue;
    }

    track.lastFiredAt = now;
    cues.push({ id, severity: hit.severity, message: hit.message });
  }

  return cues;
}

/**
 * 已过防抖、且本帧仍触发的规则（条常驻展示用）。
 * 与 pushFeedback 不同：冷却期内仍返回，便于 FeedbackBar 持续显示 correcting。
 * 须先调用 pushFeedback 更新 tracks。
 */
export function listConfirmedFeedback(
  state: FeedbackState,
  validation: ValidationResult,
  now: number,
  cfg: FeedbackConfig = DEFAULT_FEEDBACK_CONFIG,
): FeedbackCue[] {
  const out: FeedbackCue[] = [];
  for (const r of validation.results) {
    if (!r.triggered) continue;
    const track = state.tracks[r.id];
    if (!track || track.activeSince == null) continue;
    if (now - track.activeSince < cfg.debounceMs) continue;
    out.push({ id: r.id, severity: r.severity, message: r.message });
  }
  return out;
}
