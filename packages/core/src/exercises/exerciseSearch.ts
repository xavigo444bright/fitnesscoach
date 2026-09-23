/**
 * 课内「加动作」搜索（T22）。空查询返回全表；不改容量公式。
 */
import {
  EXERCISE_CATALOG,
  isCoachableId,
  type ExerciseCatalogEntry,
} from "./catalog.js";

/** 英文名、近义、常见写法。id / 中文名另外自动纳入。 */
const EXERCISE_SEARCH_ALIASES: Record<string, readonly string[]> = {
  pushup: ["push-up", "pushup", "push up", "伏地挺身", "俯撑"],
  "bench-press": ["bench", "bench press", "卧推", "杠铃卧推", "chest press"],
  "db-fly": ["fly", "dumbbell fly", "pec fly", "飞鸟", "夹胸"],
  dip: ["dips", "chest dip", "双杠", "臂屈伸"],
  "incline-pushup": [
    "incline push-up",
    "incline pushup",
    "上斜俯撑",
    "上斜",
  ],
  "cable-crossover": [
    "cable fly",
    "crossover",
    "cable crossover",
    "绳索夹胸",
    "夹胸",
  ],
  "chest-press-machine": [
    "machine chest press",
    "chest press machine",
    "推胸器",
    "坐姿推胸",
  ],
  ohp: [
    "overhead press",
    "ohp",
    "shoulder press",
    "military press",
    "推举",
    "站姿推举",
  ],
  "lateral-raise": ["side raise", "lateral raise", "侧平举", "侧举"],
  "front-raise": ["front raise", "前平举", "前举"],
  "rear-delt-fly": [
    "reverse fly",
    "rear delt",
    "bent over fly",
    "俯身飞鸟",
    "后束飞鸟",
  ],
  "face-pull": ["face pull", "面拉"],
  "pike-pushup": ["pike push-up", "pike pushup", "派克", "派克俯卧撑"],
  "db-row": ["dumbbell row", "db row", "单臂划船", "哑铃划船", "划船"],
  pullup: ["pull-up", "pullup", "pull up", "引体", "引体向上", "chin-up"],
  "lat-pulldown": ["lat pulldown", "pulldown", "高位下拉", "下拉"],
  "seated-row": ["seated row", "cable row", "坐姿划船", "划船"],
  superman: ["superman", "超人式", "back extension"],
  "band-row": ["band row", "resistance band row", "弹力带划船", "划船"],
  squat: [
    "squat",
    "squats",
    "air squat",
    "bodyweight squat",
    "bw squat",
    "下蹲",
    "深蹲",
  ],
  "glute-bridge": ["glute bridge", "hip bridge", "臀桥", "桥式"],
  lunge: ["lunge", "forward lunge", "弓步", "弓步蹲", "箭步蹲"],
  rdl: [
    "rdl",
    "romanian deadlift",
    "deadlift",
    "罗马尼亚硬拉",
    "硬拉",
  ],
  "leg-press": ["leg press", "腿举"],
  "calf-raise": ["calf raise", "提踵", "踮脚"],
  "goblet-squat": ["goblet squat", "高脚杯", "高脚杯深蹲"],
  plank: ["plank", "平板", "平板支撑"],
  "dead-bug": ["dead bug", "死虫", "死虫式"],
  "bird-dog": ["bird dog", "鸟狗", "鸟狗式"],
  crunch: ["crunch", "sit-up", "卷腹"],
  "side-plank": ["side plank", "侧平板"],
  "hanging-knee-raise": [
    "hanging knee raise",
    "hanging raise",
    "悬垂提膝",
    "提膝",
  ],
};

function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s\-_.·，,]/g, "");
}

function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i += 1;
    if (i >= needle.length) return true;
  }
  return needle.length === 0;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 99;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[] = new Array(rows * cols);
  for (let i = 0; i < rows; i += 1) dp[i * cols] = i;
  for (let j = 0; j < cols; j += 1) dp[j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i * cols + j] = Math.min(
        dp[(i - 1) * cols + j] + 1,
        dp[i * cols + j - 1] + 1,
        dp[(i - 1) * cols + j - 1] + cost,
      );
    }
  }
  return dp[a.length * cols + b.length]!;
}

function scoreEntry(entry: ExerciseCatalogEntry, raw: string, q: string): number {
  const idN = normalize(entry.id);
  const nameN = normalize(entry.name);
  const idSpaced = normalize(entry.id.replace(/-/g, " "));
  const aliasN = (EXERCISE_SEARCH_ALIASES[entry.id] ?? []).map(normalize);
  const primary = [idN, nameN, idSpaced];
  const all = [...primary, ...aliasN];

  if (primary.some((h) => h === q)) return 100;
  if (entry.name === raw || entry.id === raw) return 95;
  if (aliasN.includes(q)) return 88;
  if (primary.some((h) => h.startsWith(q))) return 80;
  if (aliasN.some((h) => h.startsWith(q))) return 74;
  if (primary.some((h) => h.includes(q))) return 60;
  if (aliasN.some((h) => h.includes(q))) return 55;
  if (q.length >= 2 && all.some((h) => isSubsequence(q, h))) return 35;
  if (q.length >= 3 && q.length <= 12) {
    const fuzzy = all.some(
      (h) => Math.abs(h.length - q.length) <= 2 && editDistance(q, h) <= 1,
    );
    if (fuzzy) return 40;
  }
  return 0;
}

/** 空查询返回完整动作库（原顺序）。有查询按相关度。 */
export function searchCatalogExercises(query: string): ExerciseCatalogEntry[] {
  const raw = query.trim();
  if (raw === "") return EXERCISE_CATALOG.slice();
  const q = normalize(raw);
  if (q === "") return EXERCISE_CATALOG.slice();
  return EXERCISE_CATALOG.map((entry) => ({
    entry,
    score: scoreEntry(entry, raw, q),
  }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const len = a.entry.name.length - b.entry.name.length;
      if (len !== 0) return len;
      return a.entry.name.localeCompare(b.entry.name, "zh-CN");
    })
    .map((row) => row.entry);
}

function primaryExact(entry: ExerciseCatalogEntry, q: string): boolean {
  return (
    normalize(entry.name) === q ||
    normalize(entry.id) === q ||
    normalize(entry.id.replace(/-/g, " ")) === q
  );
}

function aliasExact(entry: ExerciseCatalogEntry, q: string): boolean {
  return (EXERCISE_SEARCH_ALIASES[entry.id] ?? []).some(
    (alias) => normalize(alias) === q,
  );
}

/** 唯一精确命中才算库内动作；「飞鸟」这种多名命中不当作唯一。 */
export function uniqueCatalogMatchForQuery(
  query: string,
): ExerciseCatalogEntry | undefined {
  const raw = query.trim();
  if (raw === "") return undefined;
  const q = normalize(raw);
  if (q === "") return undefined;
  const byPrimary = EXERCISE_CATALOG.filter((e) => primaryExact(e, q));
  if (byPrimary.length === 1) return byPrimary[0];
  if (byPrimary.length > 1) return undefined;
  const byAlias = EXERCISE_CATALOG.filter((e) => aliasExact(e, q));
  if (byAlias.length === 1) return byAlias[0];
  return undefined;
}

type FollowAlongRef =
  | { kind: "catalog"; catalogId: string }
  | { kind: "custom"; name: string };

/** 组表「跟练」用的 catalog id。自定义名若唯一对应库内可跟练动作，也给出。 */
export function followAlongCatalogId(
  exercise: FollowAlongRef,
): string | undefined {
  if (exercise.kind === "catalog") {
    return isCoachableId(exercise.catalogId) ? exercise.catalogId : undefined;
  }
  const match = uniqueCatalogMatchForQuery(exercise.name);
  if (match && isCoachableId(match.id)) return match.id;
  return undefined;
}
