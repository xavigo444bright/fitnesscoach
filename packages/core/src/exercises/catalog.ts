/**
 * 分部位分层动作库（FR-001 扩展）
 * tier=coachable：可训练；catalog：仅浏览，待 RULE-BOUNDARY 升级。
 */

export type BodyPart = "chest" | "shoulders" | "back" | "legs" | "core";

export type Equipment =
  | "bodyweight"
  | "dumbbell"
  | "barbell"
  | "machine"
  | "band"
  | "other";

export type ExerciseTier = "coachable" | "catalog";

export type CameraHint = "side" | "front";

export interface ExerciseCatalogEntry {
  id: string;
  name: string;
  bodyPart: BodyPart;
  equipment: Equipment;
  cameraHint: CameraHint;
  tier: ExerciseTier;
  cues: string[];
  statusNote?: string;
  /** 详情页预渲染 demo 文件名，相对 apps/mobile/assets/demos/ */
  demoAsset?: string;
}

export const BODY_PART_ORDER: BodyPart[] = [
  "chest",
  "shoulders",
  "back",
  "legs",
  "core",
];

export const BODY_PART_LABEL: Record<BodyPart, string> = {
  chest: "胸",
  shoulders: "肩",
  back: "背",
  legs: "下肢",
  core: "核心",
};

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  bodyweight: "自重",
  dumbbell: "哑铃",
  barbell: "杠铃",
  machine: "器械",
  band: "弹力带",
  other: "其他",
};

/** 升级队列（Phase D）：按此顺序逐个 RULE-BOUNDARY 升级为 coachable。 */
export const COACHABLE_UPGRADE_QUEUE: string[] = [
  "glute-bridge",
  "lunge",
  "plank",
  "db-row",
  "ohp",
  "bench-press",
];

export const EXERCISE_CATALOG: ExerciseCatalogEntry[] = [
  // —— 胸 ——
  {
    id: "pushup",
    name: "俯卧撑",
    bodyPart: "chest",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "coachable",
    demoAsset: "pushup.mp4",
    cues: [
      "身体从头到脚保持一条直线，髋不塌不撅",
      "胸口靠近地面，肘角进入底部再撑起",
      "手机侧面摆放，看清肩、肘、髋、踝",
    ],
  },
  {
    id: "bench-press",
    name: "杠铃卧推",
    bodyPart: "chest",
    equipment: "barbell",
    cameraHint: "side",
    tier: "catalog",
    cues: ["肩胛回缩贴凳", "杠落到胸中下再推起", "手腕保持中立"],
    statusNote: "即将支持教练",
  },
  {
    id: "db-fly",
    name: "哑铃飞鸟",
    bodyPart: "chest",
    equipment: "dumbbell",
    cameraHint: "front",
    tier: "catalog",
    cues: ["肘微屈固定", "大臂在胸前平面开合", "底部不甩肩"],
    statusNote: "即将支持教练",
  },
  {
    id: "dip",
    name: "双杠臂屈伸",
    bodyPart: "chest",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "catalog",
    cues: ["躯干略前倾练胸", "肘向后屈", "肩勿过度下沉"],
    statusNote: "即将支持教练",
  },
  {
    id: "incline-pushup",
    name: "上斜俯卧撑",
    bodyPart: "chest",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "catalog",
    cues: ["手撑高处，身体一条线", "下降至胸近支撑面"],
    statusNote: "即将支持教练",
  },
  {
    id: "cable-crossover",
    name: "绳索夹胸",
    bodyPart: "chest",
    equipment: "machine",
    cameraHint: "front",
    tier: "catalog",
    cues: ["肘微屈划弧", "在胸前交汇稍停"],
    statusNote: "即将支持教练",
  },
  {
    id: "chest-press-machine",
    name: "坐姿推胸器",
    bodyPart: "chest",
    equipment: "machine",
    cameraHint: "side",
    tier: "catalog",
    cues: ["背贴靠垫", "推至肘将直但不锁死"],
    statusNote: "即将支持教练",
  },

  // —— 肩 ——
  {
    id: "ohp",
    name: "站姿推举",
    bodyPart: "shoulders",
    equipment: "dumbbell",
    cameraHint: "side",
    tier: "catalog",
    cues: ["核心收紧", "推至头顶上方", "勿过度挺腰"],
    statusNote: "即将支持教练",
  },
  {
    id: "lateral-raise",
    name: "哑铃侧平举",
    bodyPart: "shoulders",
    equipment: "dumbbell",
    cameraHint: "front",
    tier: "catalog",
    cues: ["微屈肘抬至约肩高", "不耸肩甩摆"],
    statusNote: "即将支持教练",
  },
  {
    id: "front-raise",
    name: "哑铃前平举",
    bodyPart: "shoulders",
    equipment: "dumbbell",
    cameraHint: "side",
    tier: "catalog",
    cues: ["手臂前抬至肩高", "控制下放"],
    statusNote: "即将支持教练",
  },
  {
    id: "rear-delt-fly",
    name: "俯身飞鸟（后束）",
    bodyPart: "shoulders",
    equipment: "dumbbell",
    cameraHint: "side",
    tier: "catalog",
    cues: ["髋铰链俯身", "肘微屈向两侧打开"],
    statusNote: "即将支持教练",
  },
  {
    id: "face-pull",
    name: "面拉",
    bodyPart: "shoulders",
    equipment: "band",
    cameraHint: "side",
    tier: "catalog",
    cues: ["拉向面部高度", "外旋肩外展"],
    statusNote: "即将支持教练",
  },
  {
    id: "pike-pushup",
    name: "派克俯卧撑",
    bodyPart: "shoulders",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "catalog",
    cues: ["髋高耸成倒 V", "头向地面下降"],
    statusNote: "即将支持教练",
  },

  // —— 背 ——
  {
    id: "db-row",
    name: "哑铃划船",
    bodyPart: "back",
    equipment: "dumbbell",
    cameraHint: "side",
    tier: "catalog",
    cues: ["躯干稳定", "肘向髋后拉", "肩胛后缩"],
    statusNote: "即将支持教练",
  },
  {
    id: "pullup",
    name: "引体向上",
    bodyPart: "back",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "catalog",
    cues: ["肩下沉启动", "下巴过杆", "控制下放"],
    statusNote: "即将支持教练",
  },
  {
    id: "lat-pulldown",
    name: "高位下拉",
    bodyPart: "back",
    equipment: "machine",
    cameraHint: "side",
    tier: "catalog",
    cues: ["杆拉至上胸", "肘向下向后"],
    statusNote: "即将支持教练",
  },
  {
    id: "seated-row",
    name: "坐姿划船",
    bodyPart: "back",
    equipment: "machine",
    cameraHint: "side",
    tier: "catalog",
    cues: ["躯干直立", "拉至腹侧，肩胛夹紧"],
    statusNote: "即将支持教练",
  },
  {
    id: "superman",
    name: "超人式",
    bodyPart: "back",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "catalog",
    cues: ["俯卧抬胸与腿", "腰勿过度反弓"],
    statusNote: "即将支持教练",
  },
  {
    id: "band-row",
    name: "弹力带划船",
    bodyPart: "back",
    equipment: "band",
    cameraHint: "side",
    tier: "catalog",
    cues: ["站姿或坐姿后拉", "肩胛主动后缩"],
    statusNote: "即将支持教练",
  },

  // —— 下肢 ——
  {
    id: "squat",
    name: "深蹲",
    bodyPart: "legs",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "coachable",
    demoAsset: "squat.mp4",
    cues: [
      "蹲至大腿约平行（膝角进入底部）",
      "膝与脚尖方向一致，避免内扣（正面更易观察）",
      "躯干适度前倾即可，避免过度折腰",
    ],
  },
  {
    id: "glute-bridge",
    name: "臀桥",
    bodyPart: "legs",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "catalog",
    cues: ["仰卧屈膝", "顶髋至肩膝一线", "顶峰收臀"],
    statusNote: "升级队列第 1：待 RULE-BOUNDARY",
  },
  {
    id: "lunge",
    name: "弓步蹲",
    bodyPart: "legs",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "catalog",
    cues: ["前后脚站距适中", "前膝约 90°", "躯干直立"],
    statusNote: "升级队列第 2",
  },
  {
    id: "rdl",
    name: "罗马尼亚硬拉",
    bodyPart: "legs",
    equipment: "dumbbell",
    cameraHint: "side",
    tier: "catalog",
    cues: ["髋铰链为主", "背平直", "感受腘绳牵拉"],
    statusNote: "即将支持教练",
  },
  {
    id: "leg-press",
    name: "腿举",
    bodyPart: "legs",
    equipment: "machine",
    cameraHint: "side",
    tier: "catalog",
    cues: ["腰贴靠垫", "膝勿内扣", "勿完全锁死"],
    statusNote: "即将支持教练",
  },
  {
    id: "calf-raise",
    name: "提踵",
    bodyPart: "legs",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "catalog",
    cues: ["脚掌前部发力", "顶峰稍停", "控制下落"],
    statusNote: "即将支持教练",
  },
  {
    id: "goblet-squat",
    name: "高脚杯深蹲",
    bodyPart: "legs",
    equipment: "dumbbell",
    cameraHint: "side",
    tier: "catalog",
    cues: ["哑铃贴胸", "肘在膝内", "蹲深可控"],
    statusNote: "即将支持教练",
  },

  // —— 核心 ——
  {
    id: "plank",
    name: "平板支撑",
    bodyPart: "core",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "catalog",
    cues: ["肩肘腕或前臂支撑", "身体一条线", "勿塌腰撅臀"],
    statusNote: "升级队列第 3（先体态，计时后补）",
  },
  {
    id: "dead-bug",
    name: "死虫式",
    bodyPart: "core",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "catalog",
    cues: ["腰贴地", "对侧手脚伸展", "呼气时稳定"],
    statusNote: "即将支持教练",
  },
  {
    id: "bird-dog",
    name: "鸟狗式",
    bodyPart: "core",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "catalog",
    cues: ["四点支撑", "对侧手脚伸直", "髋不旋转"],
    statusNote: "即将支持教练",
  },
  {
    id: "crunch",
    name: "卷腹",
    bodyPart: "core",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "catalog",
    cues: ["下背贴地", "肩胛离地即可", "勿猛拉脖"],
    statusNote: "即将支持教练",
  },
  {
    id: "side-plank",
    name: "侧平板",
    bodyPart: "core",
    equipment: "bodyweight",
    cameraHint: "front",
    tier: "catalog",
    cues: ["身体侧向一条线", "髋不上不下"],
    statusNote: "即将支持教练",
  },
  {
    id: "hanging-knee-raise",
    name: "悬垂提膝",
    bodyPart: "core",
    equipment: "bodyweight",
    cameraHint: "side",
    tier: "catalog",
    cues: ["肩下沉稳定", "膝向胸提起", "少借摆"],
    statusNote: "即将支持教练",
  },
];

export function getCatalogEntry(id: string): ExerciseCatalogEntry | undefined {
  return EXERCISE_CATALOG.find((e) => e.id === id);
}

export function catalogByBodyPart(): Record<BodyPart, ExerciseCatalogEntry[]> {
  const out = {} as Record<BodyPart, ExerciseCatalogEntry[]>;
  for (const part of BODY_PART_ORDER) out[part] = [];
  for (const e of EXERCISE_CATALOG) out[e.bodyPart].push(e);
  return out;
}

export function isCoachableId(id: string): id is "squat" | "pushup" {
  const e = getCatalogEntry(id);
  return e?.tier === "coachable" && (id === "squat" || id === "pushup");
}
