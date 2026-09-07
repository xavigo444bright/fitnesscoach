/**
 * 当前训练动作会话上下文（深蹲 / 俯卧撑 / … / 推胸器 / 侧平举 / 前平举 / 俯身飞鸟 / 面拉 / 派克）。
 */
import {
  BENCH_PRESS,
  BENCH_PRESS_DEPTH_RULE_ID,
  BENCH_PRESS_RULES,
  DB_FLY,
  DB_FLY_DEPTH_RULE_ID,
  DB_FLY_RULES,
  DIP,
  DIP_DEPTH_RULE_ID,
  DIP_RULES,
  INCLINE_PUSHUP,
  INCLINE_PUSHUP_DEPTH_RULE_ID,
  INCLINE_PUSHUP_RULES,
  CABLE_CROSSOVER,
  CABLE_CROSSOVER_DEPTH_RULE_ID,
  CABLE_CROSSOVER_RULES,
  CHEST_PRESS_MACHINE,
  CHEST_PRESS_MACHINE_DEPTH_RULE_ID,
  CHEST_PRESS_MACHINE_RULES,
  LATERAL_RAISE,
  LATERAL_RAISE_DEPTH_RULE_ID,
  LATERAL_RAISE_RULES,
  FRONT_RAISE,
  FRONT_RAISE_DEPTH_RULE_ID,
  FRONT_RAISE_RULES,
  REAR_DELT_FLY,
  REAR_DELT_FLY_DEPTH_RULE_ID,
  REAR_DELT_FLY_RULES,
  FACE_PULL,
  FACE_PULL_DEPTH_RULE_ID,
  FACE_PULL_RULES,
  PIKE_PUSHUP,
  PIKE_PUSHUP_DEPTH_RULE_ID,
  PIKE_PUSHUP_RULES,
  DB_ROW,
  DB_ROW_DEPTH_RULE_ID,
  DB_ROW_RULES,
  DEFAULT_BENCH_PRESS_PHASE_CONFIG,
  DEFAULT_DB_FLY_PHASE_CONFIG,
  DEFAULT_DIP_PHASE_CONFIG,
  DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG,
  DEFAULT_CABLE_CROSSOVER_PHASE_CONFIG,
  DEFAULT_CHEST_PRESS_MACHINE_PHASE_CONFIG,
  DEFAULT_LATERAL_RAISE_PHASE_CONFIG,
  DEFAULT_FRONT_RAISE_PHASE_CONFIG,
  DEFAULT_REAR_DELT_FLY_PHASE_CONFIG,
  DEFAULT_FACE_PULL_PHASE_CONFIG,
  DEFAULT_PIKE_PUSHUP_PHASE_CONFIG,
  DEFAULT_DB_ROW_PHASE_CONFIG,
  DEFAULT_GLUTE_BRIDGE_PHASE_CONFIG,
  DEFAULT_LUNGE_PHASE_CONFIG,
  DEFAULT_OHP_PHASE_CONFIG,
  DEFAULT_PLANK_PHASE_CONFIG,
  DEFAULT_PULLUP_PHASE_CONFIG,
  DEFAULT_PUSHUP_PHASE_CONFIG,
  DEFAULT_RDL_PHASE_CONFIG,
  DEFAULT_SQUAT_PHASE_CONFIG,
  GLUTE_BRIDGE,
  GLUTE_BRIDGE_DEPTH_RULE_ID,
  GLUTE_BRIDGE_RULES,
  LUNGE,
  LUNGE_DEPTH_RULE_ID,
  LUNGE_RULES,
  OHP,
  OHP_DEPTH_RULE_ID,
  OHP_RULES,
  PLANK,
  PLANK_DEPTH_RULE_ID,
  PLANK_RULES,
  PULLUP,
  PULLUP_DEPTH_RULE_ID,
  PULLUP_RULES,
  PUSHUP,
  PUSHUP_RULES,
  RDL,
  RDL_DEPTH_RULE_ID,
  RDL_RULES,
  SQUAT,
  SQUAT_RULES,
  dbFlyDriveDeg,
  dbRowWorkingElbowAngle,
  gluteBridgeDriveDeg,
  lungeWorkingKneeAngle,
  meanVisibleElbowAngle,
  preferredVisibleElbowAngle,
  plankDriveDeg,
  pullupWorkingElbowAngle,
  pushupElbowAngle,
  rdlHipAngle,
  lateralRaiseDriveDeg,
  shoulderRaiseDriveDeg,
  squatKneeAngle,
  type AngleFn,
  type CoachableExerciseId,
  type EvaluableRule,
  type ExerciseDefinition,
  type PhaseConfig,
} from '@fitness-coach/core';

export type ExerciseId = CoachableExerciseId;

export type ExerciseSession = {
  id: ExerciseId;
  def: ExerciseDefinition;
  rules: EvaluableRule[];
  phaseConfig: PhaseConfig;
  angleFn: AngleFn;
  depthRuleId: string;
  bodyPart: string;
  cues: string[];
  countMode?: 'rep' | 'hold_second';
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
  'glute-bridge': {
    id: 'glute-bridge',
    def: GLUTE_BRIDGE,
    rules: GLUTE_BRIDGE_RULES,
    phaseConfig: DEFAULT_GLUTE_BRIDGE_PHASE_CONFIG,
    angleFn: gluteBridgeDriveDeg,
    depthRuleId: GLUTE_BRIDGE_DEPTH_RULE_ID,
    bodyPart: '下肢',
    cues: [
      '仰卧屈膝，脚着地',
      '顶髋至肩膝一线并收臀',
      '手机侧面摆放，看清肩、髋、膝',
    ],
  },
  lunge: {
    id: 'lunge',
    def: LUNGE,
    rules: LUNGE_RULES,
    phaseConfig: DEFAULT_LUNGE_PHASE_CONFIG,
    angleFn: lungeWorkingKneeAngle,
    depthRuleId: LUNGE_DEPTH_RULE_ID,
    bodyPart: '下肢',
    cues: [
      '前后脚站距适中，前膝再弯到约直角',
      '躯干保持直立，避免过度折腰',
      '手机侧面摆放，看清肩、双髋、双膝、踝',
    ],
  },
  plank: {
    id: 'plank',
    def: PLANK,
    rules: PLANK_RULES,
    phaseConfig: DEFAULT_PLANK_PHASE_CONFIG,
    angleFn: plankDriveDeg,
    depthRuleId: PLANK_DEPTH_RULE_ID,
    bodyPart: '核心',
    countMode: 'hold_second',
    cues: [
      '肩肘腕或前臂支撑，身体一条线',
      '勿撅臀；衣裤拖地仍可计秒',
      '手机侧面摆放，看清肩、髋、踝',
    ],
  },
  'db-row': {
    id: 'db-row',
    def: DB_ROW,
    rules: DB_ROW_RULES,
    phaseConfig: DEFAULT_DB_ROW_PHASE_CONFIG,
    angleFn: dbRowWorkingElbowAngle,
    depthRuleId: DB_ROW_DEPTH_RULE_ID,
    bodyPart: '背部',
    cues: [
      '躯干稳定，肘向髋后拉',
      '肩胛后缩，避免甩腰代偿',
      '手机侧面摆放，看清肩、肘、髋',
    ],
  },
  ohp: {
    id: 'ohp',
    def: OHP,
    rules: OHP_RULES,
    phaseConfig: DEFAULT_OHP_PHASE_CONFIG,
    angleFn: meanVisibleElbowAngle,
    depthRuleId: OHP_DEPTH_RULE_ID,
    bodyPart: '肩部',
    cues: [
      '核心收紧，推至头顶锁肘',
      '勿过度挺腰借力',
      '手机侧面摆放，看清肩、肘、髋',
    ],
  },
  'bench-press': {
    id: 'bench-press',
    def: BENCH_PRESS,
    rules: BENCH_PRESS_RULES,
    phaseConfig: DEFAULT_BENCH_PRESS_PHASE_CONFIG,
    angleFn: meanVisibleElbowAngle,
    depthRuleId: BENCH_PRESS_DEPTH_RULE_ID,
    bodyPart: '胸部',
    cues: [
      '肩胛回缩贴凳',
      '杠落到胸口再推起锁肘',
      '手机侧面摆放，看清肩、肘、髋',
    ],
  },
  rdl: {
    id: 'rdl',
    def: RDL,
    rules: RDL_RULES,
    phaseConfig: DEFAULT_RDL_PHASE_CONFIG,
    angleFn: rdlHipAngle,
    depthRuleId: RDL_DEPTH_RULE_ID,
    bodyPart: '下肢',
    cues: [
      '髋铰链为主，膝保持相对伸',
      '背平直，铃贴腿下放再锁髋',
      '手机侧面摆放，看清肩、髋、膝',
    ],
  },
  pullup: {
    id: 'pullup',
    def: PULLUP,
    rules: PULLUP_RULES,
    phaseConfig: DEFAULT_PULLUP_PHASE_CONFIG,
    angleFn: pullupWorkingElbowAngle,
    depthRuleId: PULLUP_DEPTH_RULE_ID,
    bodyPart: '背部',
    cues: [
      '肩下沉启动，拉至下巴过杆',
      '控制下放，少借摆浪',
      '手机侧面摆放，看清肩、肘',
    ],
  },
  'db-fly': {
    id: 'db-fly',
    def: DB_FLY,
    rules: DB_FLY_RULES,
    phaseConfig: DEFAULT_DB_FLY_PHASE_CONFIG,
    angleFn: dbFlyDriveDeg,
    depthRuleId: DB_FLY_DEPTH_RULE_ID,
    bodyPart: '胸部',
    cues: [
      '肘微屈固定，大臂在胸前平面开合',
      '底部打开够深，不要半程',
      '手机放凳侧 3/4，看清双肩双腕',
    ],
  },
  dip: {
    id: 'dip',
    def: DIP,
    rules: DIP_RULES,
    phaseConfig: DEFAULT_DIP_PHASE_CONFIG,
    angleFn: preferredVisibleElbowAngle,
    depthRuleId: DIP_DEPTH_RULE_ID,
    bodyPart: '胸部',
    cues: [
      '锁肘撑起，屈肘到上臂约平行再撑起',
      '躯干略前倾练胸（3/4）',
      '手机放双杠斜前方 3/4，看清肩、肘',
    ],
  },
  'incline-pushup': {
    id: 'incline-pushup',
    def: INCLINE_PUSHUP,
    rules: INCLINE_PUSHUP_RULES,
    phaseConfig: DEFAULT_INCLINE_PUSHUP_PHASE_CONFIG,
    angleFn: meanVisibleElbowAngle,
    depthRuleId: INCLINE_PUSHUP_DEPTH_RULE_ID,
    bodyPart: '胸部',
    cues: [
      '手撑高处，身体一条线',
      '下降至胸近支撑面',
      '手机侧面摆放，看清肩、肘、髋、踝',
    ],
  },
  'cable-crossover': {
    id: 'cable-crossover',
    def: CABLE_CROSSOVER,
    rules: CABLE_CROSSOVER_RULES,
    phaseConfig: DEFAULT_CABLE_CROSSOVER_PHASE_CONFIG,
    angleFn: dbFlyDriveDeg,
    depthRuleId: CABLE_CROSSOVER_DEPTH_RULE_ID,
    bodyPart: '胸部',
    cues: [
      '肘微屈划弧，在胸前交汇稍停',
      '打开够开再夹回，不要半程',
      '手机正面摆放，看清双肩双腕',
    ],
  },
  'chest-press-machine': {
    id: 'chest-press-machine',
    def: CHEST_PRESS_MACHINE,
    rules: CHEST_PRESS_MACHINE_RULES,
    phaseConfig: DEFAULT_CHEST_PRESS_MACHINE_PHASE_CONFIG,
    angleFn: meanVisibleElbowAngle,
    depthRuleId: CHEST_PRESS_MACHINE_DEPTH_RULE_ID,
    bodyPart: '胸部',
    cues: [
      '背贴靠垫',
      '收到胸口再推起',
      '手机侧面摆放，看清肩、肘',
    ],
  },
  'lateral-raise': {
    id: 'lateral-raise',
    def: LATERAL_RAISE,
    rules: LATERAL_RAISE_RULES,
    phaseConfig: DEFAULT_LATERAL_RAISE_PHASE_CONFIG,
    angleFn: lateralRaiseDriveDeg,
    depthRuleId: LATERAL_RAISE_DEPTH_RULE_ID,
    bodyPart: '肩部',
    cues: [
      '微屈肘向两侧抬至约肩高',
      '不耸肩甩摆',
      '手机正面摆放，看清双肩双肘',
    ],
  },
  'front-raise': {
    id: 'front-raise',
    def: FRONT_RAISE,
    rules: FRONT_RAISE_RULES,
    phaseConfig: DEFAULT_FRONT_RAISE_PHASE_CONFIG,
    angleFn: shoulderRaiseDriveDeg,
    depthRuleId: FRONT_RAISE_DEPTH_RULE_ID,
    bodyPart: '肩部',
    cues: [
      '手臂前抬至约肩高',
      '控制下放，不要甩',
      '手机侧面摆放，看清肩、肘',
    ],
  },
  'rear-delt-fly': {
    id: 'rear-delt-fly',
    def: REAR_DELT_FLY,
    rules: REAR_DELT_FLY_RULES,
    phaseConfig: DEFAULT_REAR_DELT_FLY_PHASE_CONFIG,
    angleFn: dbFlyDriveDeg,
    depthRuleId: REAR_DELT_FLY_DEPTH_RULE_ID,
    bodyPart: '肩部',
    cues: [
      '髋铰链俯身，肘微屈向两侧打开',
      '打开够开再合拢，不要半程',
      '手机斜侧 3/4，看清双肩双腕',
    ],
  },
  'face-pull': {
    id: 'face-pull',
    def: FACE_PULL,
    rules: FACE_PULL_RULES,
    phaseConfig: DEFAULT_FACE_PULL_PHASE_CONFIG,
    angleFn: meanVisibleElbowAngle,
    depthRuleId: FACE_PULL_DEPTH_RULE_ID,
    bodyPart: '肩部',
    cues: [
      '拉向面部高度，肘外展外旋',
      '不要拉成高位划船',
      '手机斜前方 3/4，看清肩、肘',
    ],
  },
  'pike-pushup': {
    id: 'pike-pushup',
    def: PIKE_PUSHUP,
    rules: PIKE_PUSHUP_RULES,
    phaseConfig: DEFAULT_PIKE_PUSHUP_PHASE_CONFIG,
    angleFn: meanVisibleElbowAngle,
    depthRuleId: PIKE_PUSHUP_DEPTH_RULE_ID,
    bodyPart: '肩部',
    cues: [
      '髋高耸成倒 V',
      '头向地面下降再撑起',
      '手机侧面摆放，看清肩、肘、髋、踝',
    ],
  },
};

export function getExerciseSession(id: ExerciseId): ExerciseSession {
  return SESSIONS[id];
}

/** 调试 HUD：驱动角标签。臀桥 angleFn 是 180−髋伸，展示时换算回髋伸。 */
export function driveAngleHud(
  id: ExerciseId,
  driveDeg: number | null,
): { label: string; displayDeg: number | null } {
  if (id === 'pushup') return { label: '肘角', displayDeg: driveDeg };
  if (id === 'glute-bridge') {
    return {
      label: '髋伸角',
      displayDeg: driveDeg == null ? null : 180 - driveDeg,
    };
  }
  if (id === 'lunge') return { label: '工作膝角', displayDeg: driveDeg };
  if (id === 'plank') {
    return {
      label: '身体一线',
      displayDeg: driveDeg == null ? null : 180 - driveDeg,
    };
  }
  if (id === 'db-row') return { label: '工作肘角', displayDeg: driveDeg };
  if (id === 'ohp' || id === 'bench-press') {
    return { label: '肘角', displayDeg: driveDeg };
  }
  if (id === 'rdl') return { label: '髋角', displayDeg: driveDeg };
  if (id === 'pullup') return { label: '工作肘角', displayDeg: driveDeg };
  if (id === 'db-fly' || id === 'cable-crossover' || id === 'rear-delt-fly') {
    return {
      label: '开合角',
      displayDeg: driveDeg == null ? null : 180 - driveDeg,
    };
  }
  if (id === 'lateral-raise' || id === 'front-raise') {
    return {
      label: '外展角',
      displayDeg: driveDeg == null ? null : 180 - driveDeg,
    };
  }
  if (id === 'dip' || id === 'incline-pushup' || id === 'chest-press-machine') {
    return { label: '肘角', displayDeg: driveDeg };
  }
  if (id === 'face-pull' || id === 'pike-pushup') {
    return { label: '肘角', displayDeg: driveDeg };
  }
  return { label: '膝角', displayDeg: driveDeg };
}
