/**
 * 把 core.pushFeedback 接到 FeedbackBar（M3-T4 / VT-P3A-004,005）
 */

import {
  initialFeedbackState,
  listConfirmedFeedback,
  pushFeedback,
  type FeedbackConfig,
  type FeedbackCue,
  type FeedbackState,
  type ValidationResult,
} from "@fitness-coach/core";
import {
  initialFeedbackBarState,
  stepFeedbackBar,
  type FeedbackBarConfig,
  type FeedbackBarItem,
  type FeedbackBarState,
} from "./feedbackBar.js";

export interface WiredFeedbackState {
  feedback: FeedbackState;
  bar: FeedbackBarState;
}

export function initialWiredFeedbackState(): WiredFeedbackState {
  return {
    feedback: initialFeedbackState(),
    bar: initialFeedbackBarState(),
  };
}

/**
 * 一帧：防抖/冷却更新 → 已确认线索喂给 FeedbackBar（含 recovered）。
 */
export function stepWiredFeedback(
  state: WiredFeedbackState,
  validation: ValidationResult,
  nowMs: number,
  feedbackCfg?: FeedbackConfig,
  barCfg?: FeedbackBarConfig,
): {
  state: WiredFeedbackState;
  items: FeedbackBarItem[];
  /** 本帧新播报（过冷却），可供 TTS 等；条展示用 items。 */
  newCues: FeedbackCue[];
} {
  const newCues = pushFeedback(
    state.feedback,
    validation,
    nowMs,
    feedbackCfg,
  );
  const confirmed = listConfirmedFeedback(
    state.feedback,
    validation,
    nowMs,
    feedbackCfg,
  );
  const barStep = stepFeedbackBar(
    state.bar,
    confirmed.map((c) => ({
      id: c.id,
      severity: c.severity,
      message: c.message,
    })),
    nowMs,
    barCfg,
  );
  return {
    state: { feedback: state.feedback, bar: barStep.state },
    items: barStep.items,
    newCues,
  };
}
