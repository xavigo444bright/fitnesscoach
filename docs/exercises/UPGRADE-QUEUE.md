# Coachable 升级队列（Phase D → E）

> **Phase D（Scout 10）**：VT-P6-006～013 通过。这 10 条是 FR-089 **祖父**，不补机位规格。  
> **Phase E**：胸部 5 条。机位已定稿。9 条已按核窗 `authorized`，整批 download+crop。VT-P6-014～018 通过。

每次只升级 **1** 个动作（批量接线须你明确要求）。**本批用户已要求剩余 3 条一次做完一起验收。** Phase F 肩 5 条同样一次接线、一起真机。流水线：

0. **机位规格**（FR-089）：`docs/exercises/camera-planes/specs.json`，评估桶三选一（正面/冠状面；侧面；双机位或 3/4）
1. 按规格收 `clips.json`（`requiredClipCameras` 必须齐）
2. 定稿 `docs/exercises/<id>-rules.md`（按平面写规则，推荐 ≠ 唯一朝向）
3. `boundary/<id>Matrix` + sweep + 契约测（VT-RB-004）
4. `exercises/<id>.ts` + 夹具
5. keyframes + App `exerciseSession` 接线
6. catalog 将该条 `tier` → `coachable`
7. 真机 VT：推荐平面一条；`countPlanes` 含第二平面则再验该平面仍可计、该关的规则关掉

祖父 10 条仍是当时的 1–6 步（无第 0 步），不回溯。

## Phase D 顺序（已接线）

| 顺序 | id | 名称 | 部位 | 状态 |
|------|-----|------|------|------|
| 1 | glute-bridge | 臀桥 | 下肢 | **coachable**（VT-P6-006 通过） |
| 2 | lunge | 弓步蹲 | 下肢 | **coachable**（VT-P6-007 通过） |
| 3 | plank | 平板支撑 | 核心 | **coachable**（VT-P6-008 通过） |
| 4 | db-row | 哑铃划船 | 背 | **coachable**（VT-P6-009 通过） |
| 5 | ohp | 站姿推举 | 肩 | **coachable**（VT-P6-010 通过） |
| 6 | bench-press | 杠铃卧推 | 胸 | **coachable**（VT-P6-011 通过） |
| 7 | rdl | 罗马尼亚硬拉 | 下肢 | **coachable**（VT-P6-012 通过） |
| 8 | pullup | 引体向上 | 背 | **coachable**（VT-P6-013 通过） |

## Phase E 顺序（胸，机位已定）

| 顺序 | id | 名称 | 评估桶 | 必收片（最佳，无可选） | 状态 |
|------|-----|------|--------|------------------------|------|
| 1 | db-fly | 哑铃飞鸟 | 双机位或 3/4 | `three_quarter` + `front`（头侧/偏正） | **coachable**（VT-P6-014 通过） |
| 2 | dip | 双杠臂屈伸 | 双机位或 3/4 | `three_quarter` + `front` | **coachable**（VT-P6-015 通过；正面绕拍不打进包） |
| 3 | incline-pushup | 上斜俯卧撑 | 双机位或 3/4 | `side` + `front` | **coachable**（VT-P6-016 通过；正面不打进包） |
| 4 | cable-crossover | 绳索夹胸 | 正面/冠状面 | `front` | **coachable**（VT-P6-017 通过） |
| 5 | chest-press-machine | 坐姿推胸器 | 双机位或 3/4 | `side` + `three_quarter` | **coachable**（VT-P6-018 通过；3/4 不打进包） |

不收录：飞鸟纯侧、臂屈伸清侧、夹胸 3/4、推胸器正对脸。

锁变式：飞鸟 = **仰卧平板飞鸟**（不是站姿飞鸟）。上斜俯卧撑按俯卧撑一线，只是手撑高处。夹胸 = 站姿龙门中位划弧交汇。

## 下一动作

**2026-09-21 重开扩库**（给 grokbot scout）。机位已写入 `camera-planes/specs.json`。先检索 YouTube 出 `proposed`，用户授权后再 ingest。不要一次接线。

真源：[`asset-scout/expansion-queue.json`](./asset-scout/expansion-queue.json) · 协议：[`asset-scout/GROKBOT-SCOUT.md`](./asset-scout/GROKBOT-SCOUT.md)

### Phase G（catalog 已有，优先）

| 顺序 | id | 名称 | 评估桶 | 必收片 | 窗 |
|------|-----|------|--------|--------|----|
| 1 | lat-pulldown | 高位下拉 | 正面 | `front` | reps |
| 2 | seated-row | 坐姿划船 | 侧面 | `side` | reps |
| 3 | superman | 超人式 | 侧面 | `side` | reps |
| 4 | band-row | 弹力带划船 | 侧面 | `side` | reps |
| 5 | leg-press | 腿举 | 侧面 | `side` | reps |
| 6 | calf-raise | 提踵 | 侧面 | `side` | reps |
| 7 | goblet-squat | 高脚杯深蹲 | 侧面 | `side` | reps |
| 8 | dead-bug | 死虫式 | 侧面 | `side` | reps |
| 9 | bird-dog | 鸟狗式 | 侧面 | `side` | reps |
| 10 | crunch | 卷腹 | 侧面 | `side` | reps |
| 11 | side-plank | 侧平板 | 正面 | `front` | hold |
| 12 | hanging-knee-raise | 悬垂提膝 | 侧面 | `side` | reps |

### Phase H（99 条新 id，尚未进 catalog）

胸 16 · 肩 7 · 背/臂 21 · 下肢 29 · 核心 26。弯举暂挂 `back`，臂屈伸暂挂 `chest`/`shoulders`（库里还没有「手臂」分区）。

不拆：chin-up、走/反向弓步、站姿绳索飞鸟、单臂哑铃划船、军事推、相扑硬拉、箱式蹲、直立划船、颈后推、farmer/burpee/box-jump/举重三翻。

**Phase F（肩）** 已接线并 **coachable**（VT-P6-019～023 通过 2026-09-07）。

| 顺序 | id | 名称 | 评估桶 | 必收片 | 状态 |
|------|-----|------|--------|--------|------|
| 1 | lateral-raise | 哑铃侧平举 | 正面/冠状面 | `front` | **coachable**（VT-P6-019 通过） |
| 2 | front-raise | 哑铃前平举 | 侧面 | `side` | **coachable**（VT-P6-020 通过） |
| 3 | rear-delt-fly | 俯身飞鸟（后束） | 双机位或 3/4 | `three_quarter` | **coachable**（VT-P6-021 通过） |
| 4 | face-pull | 面拉 | 双机位或 3/4 | `three_quarter` | **coachable**（VT-P6-022 通过） |
| 5 | pike-pushup | 派克俯卧撑 | 侧面 | `side` | **coachable**（VT-P6-023 通过） |
