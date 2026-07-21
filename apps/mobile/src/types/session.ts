/** 训练会话结束摘要（M4-T5 / FR-072） */
export type SessionSummaryData = {
  reps: number;
  durationMs: number;
  topIssue?: { message: string; count: number };
};
