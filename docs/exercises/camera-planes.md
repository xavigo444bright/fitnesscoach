# 机位规格（FR-089）

> 出 [`asset-scout/clips.json`](./asset-scout/clips.json) **之前**必须先写本规格。  
> 机器真源：[`camera-planes/specs.json`](./camera-planes/specs.json)。  
> 已接线的 Scout 10 条（`grandfatheredExerciseIds`）**不补规格、不改接线**。

## 为什么单独一步

扩库时若先搜侧片再写 `camera_hint: side`，会把「推荐」写成「只能侧面」。平板需要侧面是几何事实；引体正面也能计次，却被同一套流水线锁死。

本步先定**评估桶**和**必须收到的片**，再允许往 `clips.json` 加行。

## 三个评估桶

新动作必须选一，禁止默认「先侧面、正面可选」。

| `evaluation` | 含义 | 何时选 |
|--------------|------|--------|
| `front` | **正面 / 冠状面**（脸朝镜头）即可覆盖本版计数与示范 | 行程主要在左右开合：侧平举、绳索夹胸、侧平板 |
| `side` | **侧面 / 矢状面**（身体一侧）才能读驱动角或一线 | 平板一线、臀桥髋伸、RDL 铰链 |
| `dual_or_three_quarter` | 需要 **双机位**，或一条 **3/4** 同时服务计数与示范 | 引体/下拉（杠前摆机）、推举（镜前+防塌腰）、卧推（侧 vs 凳头）、深蹲膝内扣 |

`dual_or_three_quarter` 的 `requiredClipCameras` 只能是：

- `["front", "side"]`，或
- 含 `three_quarter`（可再加 side/front 作可选）

不要既写 `evaluation: side` 又只收正面片。

## 平面 ID（片源 `camera`）

| ID | 几何 | `clips.json` 的 `camera` |
|----|------|--------------------------|
| `front` | 冠状面 | `front` |
| `side` | 矢状面 | `side` |
| `three_quarter` | 斜侧 3/4 | `three_quarter`（Pose 提取按侧面处理） |

运行时 catalog 的 `cameraHint` 仍是 `front` \| `side`（详情页推荐）。3/4 的 `defaultHint` 一般填 `side`。缺示范片 ≠ 禁止该平面计次；站位条只在规格写明「该平面计数不可用」时才把人赶到另一侧。

## 规格字段

每个**非祖父** catalog id 在 `specs.json` → `exercises.<id>`：

| 字段 | 含义 |
|------|------|
| `evaluation` | 上表三选一 |
| `countPlanes` | 驱动角在 2D 可读、**允许计次**的平面 |
| `cuePlanes` | 某条错误必须在哪些平面评估；其它平面关掉（防假阳性，同深蹲膝内扣） |
| `defaultHint` | 详情页推荐：`front` 或 `side` |
| `requiredClipCameras` | 写入 `clips.json` **之前**必须收到的 `camera` 集合 |
| `optionalClipCameras` | 可后补，不挡本版接线 |
| `placementNote` | 家里 / 健身房人会把手机放哪 |
| `rationale` | 一两句：为何是这个桶，而不是「先侧一条」 |

`requiredClipCameras` 是选片门闩。打不打进安装包仍走 **NFR-010**（可按需下载）。

## 流程（新动作）

```
填 specs.json（本文件）
  → 你确认评估桶
  → 才往 clips.json 加对应 camera 的条目
  → 授权 → ingest → 按平面写 *-rules.md + 矩阵
  → VT：推荐平面一条；若 countPlanes 含第二平面，再验「该平面仍可计 / 该关的规则关掉」
```

禁止：未写规格就搜片；只因 primary 是侧片就把 `camera_hint` 写成 side-only；VT 行一律抄「侧面计次」。

## 模板（复制进 `exercises`）

计数平面与健身房摆机一致、第二平面只补纠错时，用单桶 + optional，不要硬写成 `dual_or_three_quarter` 却只收一条正面片（校验会拒绝）。

```json
"lat-pulldown": {
  "evaluation": "front",
  "countPlanes": ["front", "three_quarter"],
  "cuePlanes": [
    { "ruleId": "pull-depth", "planes": ["front", "side", "three_quarter"] }
  ],
  "defaultHint": "front",
  "requiredClipCameras": ["front"],
  "optionalClipCameras": ["side", "three_quarter"],
  "placementNote": "面对器械，手机放在用户前方或 3/4。",
  "rationale": "计数看肘/过杆；健身房默认杠前摆机。侧面只补摆浪，不挡本版接线。"
}
```

一条 3/4 要同时当计数和示范时，用 `dual_or_three_quarter` 且 `requiredClipCameras` 含 `three_quarter`（见 Phase E 的 `db-fly` / `dip`）。

## 当前 Phase E

胸部 5 条已接线。VT-P6-014～018 通过。见 [`UPGRADE-QUEUE.md`](./UPGRADE-QUEUE.md)。

## Phase F（肩，桶已确认）

`lateral-raise` / `front-raise` / `rear-delt-fly` / `face-pull` / `pike-pushup` 规格已写入 `specs.json`。必收机位已核窗 `authorized` 并接线。optional 机位不进清单。VT-P6-019～023 通过。

## Phase G / H（扩库，2026-09-21）

catalog 剩余 12 条 + 99 条新 id 的评估桶已写入 `specs.json`，与 [`asset-scout/expansion-queue.json`](./asset-scout/expansion-queue.json) 同步。Grokbot 先按队列 `--yt-search`，再往 `clips.json` 加 `proposed`。未授权不 ingest。

## 祖父条款

`squat` / `pushup` / `glute-bridge` / `lunge` / `plank` / `db-row` / `ohp` / `bench-press` / `rdl` / `pullup` 已按当时侧片接线。不补本规格、不改规则与 App。日后若给其中某条加第二机位，再补规格并走 RULE-BOUNDARY，不在本次范围。
