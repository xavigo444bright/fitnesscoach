---
exercise: glute-bridge
name: 臀桥
camera_hint: side
prd_ref: FR-088
version: 0.2.1
status: active
---

# 臀桥 — 校验规则与相位

> AI Agent：实现 `packages/core/exercises/glute-bridge.ts` 时必须与本文件一致。  
> 边界矩阵：`packages/core/src/boundary/gluteBridgeMatrix.ts`（须与本节数字一致）。  
> 升级队列：`docs/exercises/UPGRADE-QUEUE.md` 第 1 项。  
> 对照样片：`glute-bridge-side-01`（scout look-window 2–8s，双腿仰卧地面臀桥）。  
> **FR-088**：样片锁变式、机位平面、驱动关节；**禁止**把示范者单帧 120°/179° 抄成全用户报错线。

## 覆盖的变式

- **本 id**：双腿仰卧、屈膝、脚着地、髋伸顶起的地面臀桥。
- **不拆新 id**：垫高脚/垫肩、手臂位置、节奏快慢、**髋上负重**（哑铃/杠铃压在髋上，几何仍是地面臀桥）。负重若挡住肩/髋/膝，跟踪会丢，本版不保证计次。
- **另开 id（将来）**：单腿臀桥、杠铃髋推（bench hip thrust）——上背撑凳、行程与驱动几何不同，不能套本侧摄阈值。

## 推荐机位

- **侧面**（身体一侧入画；左/右侧均可）：肩-髋-膝一线与髋行程可读
- 手机竖屏，约髋高侧放，距约 1.2–1.8m
- 需看到：肩、髋、膝；踝入画更佳

`cameraHint=side` 是推荐平面，不是禁止用户换朝向。正面几何未做；启用正面机位前须另补规则与矩阵，禁止复用本侧摄阈值。

## MediaPipe 关键点索引

| 部位 | 左 | 右 |
|------|----|----|
| 肩 | 11 | 12 |
| 髋 | 23 | 24 |
| 膝 | 25 | 26 |
| 踝 | 27 | 28 |

## 驱动角（相位机）

髋伸角 = 两侧 **肩-髋-膝** 均值。贴地较小，顶髋锁髋接近 180°。

相位机沿用深蹲语义（角高 = stand，角低 = bottom），因此：

**驱动角 `driveDeg = 180 − 髋伸角`**

| 身体 | 髋伸角（约） | driveDeg（约） | 引擎相位 |
|------|----------------|----------------|----------|
| 髋贴地静息 | 较低 | 较高 | `stand` |
| 顶髋锁髋 | 接近 180° | 接近 0° | `bottom` |

主片行程约能跨过本表相位线（证明标准动作进得了 `bottom`）；**不要**把主片最小/最大髋角写成报错阈值。

## 校验规则

| 规则 ID | 关节 (a-b-c) | 条件 | 容差 | 阶段 | 严重度 | 提示文案 |
|---------|--------------|------|------|------|--------|----------|
| hip-extension | 肩-髋-膝 | 髋伸角 ≥ 140° | 10° | bottom | error | 髋没顶够，推到肩膝一线并收臀 |
| lumbar-extension | — | 过度塌腰代偿 | — | bottom | — | **P2**：侧摄 2D 无可靠腰椎点，本版不报 |

### 判定说明（MVP）

- **顶髋**：目标肩-髋-膝 ≥ 140°；容差 10° → 仅髋伸角 **&lt; 130°** 才报没顶够。侧摄 2D 常把「看起来已锁髋」量成 140–155°，进 `bottom` 线与报错线按此放宽（v0.2.1，同俯卧撑肘深）。主路径「没顶上去」仍靠未进 `bottom` 的半程不计次。
- **塌腰**：教练常要求顶峰脊柱中立、用臀而不是腰。MediaPipe 33 点侧摄分不清腰椎过伸与髋伸，**本版不做**。升级矩阵时不得用肩-髋-膝 &gt;180° 冒充塌腰。
- **反馈缓冲**：同深蹲 — 进入/解除防抖约 800ms，冷却 3s（`feedback.ts`）。

### 依据与取舍

| 规则 | 文献/行业锚点 | 本产品取舍 |
|------|----------------|------------|
| hip-extension | NASM / ACE 等：顶峰髋、肩、膝近一条线；收臀，避免只用腰挺。无单一「必须 179°」金标准。 | **消费级 + 侧摄 2D**：目标 ≥140°、&lt;130° 才报。v0.2.0 的 160/150 在真机完整顶髋上误杀。主片顶峰可更高，不把示范者峰值当门槛。 |
| （未做）lumbar-extension | 顶峰避免腰椎过伸 | 2D 侧摄不可靠；P2 |
| （未做）膝角/脚距 | 示范窗可见屈膝脚着地 | 不作为报错线 |

## 相位定义

由 **driveDeg** 驱动，状态机同深蹲；**名字沿用引擎，身体方向与深蹲相反**：

| 相位 | 身体含义 | 进入条件（driveDeg，连续 5 帧） |
|------|----------|--------------------------------|
| stand | 髋贴地静息 | > 48°（髋伸 ≲ 132°） |
| descend | **顶起**（髋伸增加） | 48° → 40° 下降中 |
| bottom | 顶峰锁髋 | < 40°（髋伸 ≳ 140°） |
| ascend | **下放** | 40° → 48° 上升中 |

提取确认帧放宽为 2（`extractPhaseConfigFor`）。运行时仍为 5。

## Rep 计数

- 计 1 rep：`stand` → `descend` → `bottom` → `ascend` → `stand`
- bottom 阶段触发 `hip-extension` → 该次 **不计入**
- 从未进入 bottom → 半程不计，文案：「髋没顶够，未计入次数」

## Ghost 关键帧（归一化坐标，侧面）

实现时在 `packages/core/exercises/glute-bridge-keyframes.ts` 定义 4 帧（首尾 stand 共用）：

1. `stand` — 髋贴地，髋伸约 120°
2. `descend_mid` — 顶起中，髋伸约 150°
3. `bottom` — 顶峰锁髋，髋伸约 172°
4. `ascend_mid` — 下放中

插值：按当前相位在相邻关键帧间 lerp。训练页不叠半透明 Ghost；关键帧供详情/预览与 ghostPoseForExercise。

- 片源常从顶髋切入，不是 rest→peak→rest。提取用 `reconstructGluteBridgeLoop`：静息 = drive 最大，其后峰值 = drive 最小；片尾停在锁髋则镜像下放。
- **禁止** `assertCanonicalStandQuality`（仰卧，不是垂臂站立）。
- JSON：`packages/core/trajectories/glute-bridge-side-v1.json`。轨迹 JSON **未**打进 JS 包（`hasDemoTrajectory('glute-bridge') === false`）。示范窗侧面原片 `glute-bridge-side-01.mp4` 已打进 `assets/samples`（仅当前 coachable 这一条，不是 scout 整库）。
