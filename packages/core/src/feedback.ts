/**
 * @fitness-coach/core — 反馈防抖 / 冷却（M1-T8，VT-P1-007/008）
 *
 * 防抖：某错误需持续 debounceMs 才「确认」触发（滤掉抖动/单帧误检）。
 * 解除防抖：已确认后须持续 debounceMs 未触发才松开（避免噪声一帧变绿 / 误 recovered）。
 * 冷却：同一错误确认后 cooldownMs 内不重复播报。
 * 用注入时钟（传入 now）做纯函数式时间模拟，便于单测。
 */

import type { RuleResult, ValidationResult } from "./types.js";
import { summarizeValidationStatus } from "./validate.js";

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
  /** 已确认后连续「未触发」的起始时间；用于解除防抖。 */
  clearSince: number | null;
  /** 上次「确认并播报」的时间；从未播报为 null。 */
  lastFiredAt: number | null;
  /** 已过进入防抖，展示层应保持故障直到解除防抖完成。 */
  latched: boolean;
  /** latch 期间用于条/染色的最近一次文案。 */
  latchedCue: FeedbackCue | null;
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
    state.tracks[id] = {
      activeSince: null,
      clearSince: null,
      lastFiredAt: null,
      latched: false,
      latchedCue: null,
    };
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
  /** 本相位实际评估到的规则（未纳入 = 相位不适用，应立刻松开 latch） */
  const evaluatedIds = new Set<string>();
  for (const r of validation.results) {
    evaluatedIds.add(r.id);
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
      // 规则在本相位不评估（如 torso 仅 stand）→ 立刻解除，避免下蹲被站立弯腰 latch 拖黄
      if (!evaluatedIds.has(id)) {
        track.latched = false;
        track.latchedCue = null;
        track.activeSince = null;
        track.clearSince = null;
        continue;
      }
      if (!track.latched) {
        // 未确认过：单帧中断立即重计时
        track.activeSince = null;
        track.clearSince = null;
        continue;
      }
      // 已确认：须持续 debounceMs 未触发才松开（对称解除防抖）
      if (track.clearSince == null) track.clearSince = now;
      if (now - track.clearSince >= cfg.debounceMs) {
        track.latched = false;
        track.latchedCue = null;
        track.activeSince = null;
        track.clearSince = null;
      }
      continue;
    }

    // 本帧触发：取消解除计时，开始/延续进入防抖
    track.clearSince = null;
    if (track.activeSince == null) {
      track.activeSince = now;
    }

    const heldMs = now - track.activeSince;
    if (heldMs < cfg.debounceMs) {
      continue;
    }

    const cue: FeedbackCue = {
      id,
      severity: hit.severity,
      message: hit.message,
    };
    track.latched = true;
    track.latchedCue = cue;

    // 已确认：检查冷却（仅新播报）
    if (
      track.lastFiredAt != null &&
      now - track.lastFiredAt < cfg.cooldownMs
    ) {
      continue;
    }

    track.lastFiredAt = now;
    cues.push(cue);
  }

  return cues;
}

/**
 * 已确认且仍应展示的规则（条常驻 + 骨骼染色用）。
 * 含：当前仍触发且已过进入防抖；或已 latch 且解除防抖未满。
 * 须先调用 pushFeedback 更新 tracks。
 */
export function listConfirmedFeedback(
  state: FeedbackState,
  validation: ValidationResult,
  _now: number,
  _cfg: FeedbackConfig = DEFAULT_FEEDBACK_CONFIG,
): FeedbackCue[] {
  const triggeredById = new Map<string, RuleResult>();
  for (const r of validation.results) {
    if (r.triggered) triggeredById.set(r.id, r);
  }

  const out: FeedbackCue[] = [];
  const ids = new Set<string>([
    ...Object.keys(state.tracks),
    ...triggeredById.keys(),
  ]);

  for (const id of ids) {
    const track = state.tracks[id];
    if (!track?.latched || !track.latchedCue) continue;
    const hit = triggeredById.get(id);
    out.push(
      hit
        ? { id, severity: hit.severity, message: hit.message }
        : track.latchedCue,
    );
  }
  return out;
}

/**
 * 把已确认（含解除防抖窗口内）的故障叠到 validate 上，供骨骼染色。
 * 避免原始帧噪声把黄/红骨瞬间刷绿。
 */
export function displayValidation(
  validation: ValidationResult,
  confirmed: FeedbackCue[],
): ValidationResult {
  if (confirmed.length === 0) return validation;

  const byId = new Map<string, RuleResult>();
  for (const r of validation.results) {
    byId.set(r.id, { ...r });
  }
  for (const c of confirmed) {
    const prev = byId.get(c.id);
    byId.set(c.id, {
      id: c.id,
      triggered: true,
      severity: c.severity,
      message: c.message,
      measuredDeg: prev?.measuredDeg,
    });
  }
  const results = Array.from(byId.values());
  const status = summarizeValidationStatus(results);
  return {
    status,
    messages: results.filter((r) => r.triggered).map((r) => r.message),
    results,
  };
}
