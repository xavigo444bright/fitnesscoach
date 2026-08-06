/**
 * 当前训练动作会话上下文（深蹲 / 俯卧撑）。
 */
import {
  DEFAULT_PUSHUP_PHASE_CONFIG,
  DEFAULT_SQUAT_PHASE_CONFIG,
  PUSHUP,
  PUSHUP_RULES,
  SQUAT,
  SQUAT_RULES,
  pushupElbowAngle,
  squatKneeAngle,
  type AngleFn,
  type EvaluableRule,
  type ExerciseDefinition,
  type PhaseConfig,
} from '@fitness-coach/core';

export type ExerciseId = 'squat' | 'pushup';

export type ExerciseSession = {
  id: ExerciseId;
  def: ExerciseDefinition;
  rules: EvaluableRule[];
  phaseConfig: PhaseConfig;
  angleFn: AngleFn;
  depthRuleId: string;
  bodyPart: string;
  cues: string[];
};

const SESSIONS: Record<ExerciseId, ExerciseSession> = {
  squat: {
    id: 'squat',
    def: SQUAT,
    rules: SQUAT_RULES,
    phaseConfig: DEFAULT_SQUAT_PHASE_CONFIG,
    angleFn: squatKneeAngle,
    depthRuleId: 'squat-depth',
    bodyPart: '下肢',
    cues: [
      '蹲至大腿约平行（膝角进入底部）',
      '膝与脚尖方向一致，避免内扣（正面更易观察）',
      '躯干适度前倾即可，避免过度折腰',
    ],
  },
  pushup: {
    id: 'pushup',
    def: PUSHUP,
    rules: PUSHUP_RULES,
    phaseConfig: DEFAULT_PUSHUP_PHASE_CONFIG,
    angleFn: pushupElbowAngle,
    depthRuleId: 'elbow-depth',
    bodyPart: '上肢',
    cues: [
      '身体从头到脚保持一条直线，髋不塌不撅',
      '胸口靠近地面，肘角进入底部再撑起',
      '手机侧面摆放，看清肩、肘、髋、踝',
    ],
  },
};

export function getExerciseSession(id: ExerciseId): ExerciseSession {
  return SESSIONS[id];
}
