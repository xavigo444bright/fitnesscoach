---
exercise: squat
name: 深蹲
camera_hint: side
prd_ref: FR-041
version: 0.1.0
---

# 深蹲 — 校验规则与关键帧

> AI Agent：实现 `packages/core/exercises/squat.ts` 时必须与本文件一致。

## 推荐机位

- **侧面**（左侧或右侧均可，整身入镜）
- 手机竖屏，与地面约 15–30° 角，高度及腰
- 需看到：肩、髋、膝、踝

## MediaPipe 关键点索引

| 部位 | 左 | 右 |
|------|----|----|
| 肩 | 11 | 12 |
| 髋 | 23 | 24 |
| 膝 | 25 | 26 |
| 踝 | 27 | 28 |

## 校验规则

| 规则 ID | 关节 (a-b-c) | 条件 | 容差 | 阶段 | 严重度 | 提示文案 |
|---------|--------------|------|------|------|--------|----------|
| squat-depth | 髋-膝-踝 | 膝角 < 90° | 10° | bottom | error | 蹲得不够深，臀部再下沉一些 |
| knee-valgus-l | 髋-膝-踝（左） | 膝相对髋-踝线向内偏 | 15° | descend, bottom, ascend | error | 左膝内扣，向外推开膝盖 |
| knee-valgus-r | 髋-膝-踝（右） | 膝相对髋-踝线向内偏 | 15° | descend, bottom, ascend | error | 右膝内扣，向外推开膝盖 |
| torso-upright | 肩-髋-膝 | 角 160°–180° | 15° | all | warning | 躯干前倾过多，挺胸收紧核心 |

## 相位定义

| 相位 | 进入条件（膝角，连续 5 帧） |
|------|---------------------------|
| stand | > 160° |
| descend | 160° → 100° 下降中 |
| bottom | < 100° |
| ascend | 100° → 160° 上升中 |

## Rep 计数

- 计 1 rep：`stand` → `descend` → `bottom` → `ascend` → `stand`
- 若 `bottom` 阶段 `squat-depth` 触发（未达深度），该次 **不计入** rep

## Ghost 关键帧（归一化坐标，侧面）

实现时在 `packages/core/exercises/squat-keyframes.ts` 定义 5 帧：

1. `stand` — 直立
2. `descend_mid` — 下蹲至膝角约 120°
3. `bottom` — 膝角约 85°
4. `ascend_mid` — 起身中
5. `stand` — 回直立

插值：按当前相位在相邻关键帧间 lerp。
