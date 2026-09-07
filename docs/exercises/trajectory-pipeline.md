# 示范轨迹管线（FR-067～069）

> 管线本身 **done（逻辑）**。产品绘制主线为 **Plan C（PRD 0.5.0：样片轨迹 → 3D 骨骼+简化肌肉）**。  
> 详情预渲染片（FR-064）仍为 P2。评估动作仅 squat + pushup。

## 目标

示范视频 → 清洗轨迹 → 按相位/进度取样并对齐用户；供训练参考层与（可选）阈值校准消费。

**生产规范（PRD 0.6.32 / FR-088 / FR-089）**：新动作先写机位规格，再核参考窗。核过的窗是示范与轨迹真源。写规则对照样片锁变式、规格里的推荐平面、驱动角；阈值仍走 `*-rules.md` + RULE-BOUNDARY，不抄单帧角度。扩库：机位规格 → 核窗 → `--crop-only` 裁参考片 → PoseDump / 轨迹 → 按平面写规则。

## 阶段

| 阶段 | 内容 | 对应需求 | 状态 |
|------|------|----------|------|
| T0–T1 | 格式 + 离线提取 | FR-067 | **done** |
| T2 | 取样/对齐驱动参考层 | FR-068 驱动侧 | **done**（VT-P7-002）；**2D 观感否决** |
| T3 | 阈值校准工具 | FR-069 | **逻辑 done**；VT-P7-003 可延后 |
| T8+ | 3D 骨骼+肌肉绘制 | FR-068 Plan C | **当前主线** |
| — | 详情预渲染片 | FR-064 | **P2** |

## 首批动作

1. `squat`（侧面）→ `packages/core/trajectories/squat-side-v1.json`
2. `pushup`（侧面 + 正面）→ `pushup-side-v1.json` / `pushup-front-v1.json`（真片，非 synthetic）
3. `glute-bridge`（侧面）→ `glute-bridge-side-v1.json`（**磁盘产物**；未进 `getDemoTrajectory` / App 包，NFR-010）
4. `lunge`（侧面）→ `lunge-side-v1.json`（**磁盘产物**；未进 registry。示范真源是 `lunge-side-02`，不是浅弓 `lunge-side-01`）
5. `plank` / `db-row` / `ohp` / `bench-press` / `rdl` / `pullup` / `db-fly` / `dip` / `incline-pushup` / `cable-crossover` / `chest-press-machine` / `lateral-raise` / `front-raise` / `rear-delt-fly` / `face-pull` / `pike-pushup`（推荐平面）→ 磁盘 PoseDump 仅供定相位；**未** synthesize 进 JS registry

运行时：`getDemoTrajectory('squat' | 'pushup')`。臀桥/弓步/平板/划船/推举/卧推/RDL/引体/飞鸟/双杠/上斜俯卧撑/夹胸/推胸器/侧平举/前平举/俯身飞鸟/面拉/派克 `hasDemoTrajectory` 为 false；示范窗走 `CLIP_WITHOUT_TRAJECTORY` 原片。飞鸟/双杠打包的是 3/4 压缩片（文件名 `db-fly-side-01.mp4` / `dip-side-01.mp4`），头侧/正面绕拍不进包。夹胸打包正面 `cable-crossover-front-01.mp4`。侧平举打包正面 `lateral-raise-front-01.mp4`。俯身飞鸟/面拉打包 3/4（`rear-delt-fly-side-01.mp4` / `face-pull-side-01.mp4`）。上斜正面与推胸器 3/4 不进包。

### 臀桥驱动角

`driveDeg = 180 − 肩髋膝`。引擎 `stand` = 髋贴地（drive 高），`bottom` = 顶髋锁髋（drive 低）。look-window 常从顶髋切入：提取走 `reconstructGluteBridgeLoop`，**不要**套 `assertCanonicalStandQuality`。

## 轨迹 JSON 格式（schemaVersion `1.0`）

```json
{
  "schemaVersion": "1.0",
  "id": "squat-side-v1",
  "exerciseId": "squat",
  "source": { "type": "synthetic", "label": "…", "fps": 30 },
  "meta": {
    "landmarkScheme": "mediapipe33",
    "cameraHint": "side",
    "rawFrameCount": 94,
    "loopFrameRange": [4, 27]
  },
  "frames": [
    {
      "t": 0,
      "phase": "stand",
      "driveDeg": 175,
      "landmarks": [{ "i": 24, "x": 0.5, "y": 0.5, "v": 1 }]
    }
  ]
}
```

| 字段 | 含义 |
|------|------|
| `frames[].t` | 单 rep 循环内归一化进度 ∈ [0,1]（首帧 0、末帧 1） |
| `frames[].landmarks[]` | 稀疏 MediaPipe 索引；`i`/`x`/`y`/`v` |
| `source.type` | `synthetic` \| `video` \| `pose_dump` |

解析入口：`parseDemoTrajectory` / `parseDemoTrajectoryJson`（非法即抛错）。

## 离线提取

### 中间格式 PoseDump

视频经姿态估计后写入：

```json
{
  "exerciseId": "squat",
  "fps": 30,
  "cameraHint": "side",
  "label": "demo.mp4",
  "frames": [
    { "tMs": 0, "landmarks": [null, …, { "x": 0.5, "y": 0.4, "visibility": 0.9 }] }
  ]
}
```

`landmarks` 可为稠密（按索引，缺省 `null`）或稀疏 `{ i, x, y, v? }`。

### CLI

```bash
# 重新生成 bootstrap 入库 JSON
pnpm --filter @fitness-coach/trajectory-extract extract -- synthesize --all \
  --out packages/core/trajectories

# 从 PoseDump 提取（臀桥同样 --exercise glute-bridge）
pnpm --filter @fitness-coach/trajectory-extract extract -- from-dump \
  --input path/to/dump.json --exercise squat --out packages/core/trajectories
```

管线步骤（`extractDemoTrajectory` / `extractFromPoseDump`）：

1. 过滤低 visibility 帧  
2. 三点滑动平滑  
3. 相位机找完整 `stand→…→stand` 循环（取最长或指定 rep）；臀桥走 `reconstructGluteBridgeLoop`  
4. 归一化 `t∈[0,1]` 并标注 `phase` / `driveDeg`
5. 站立类默认 `assertCanonicalStandQuality`；臀桥跳过

### 片源目录

`media/trajectory-source/<exercise>/`（如 `squat/squat-side-01.mp4`）。大文件 gitignore。

### 片源获取（scout → ingest）

前半段选片清单：[`asset-scout.md`](./asset-scout.md) / [`asset-scout/clips.json`](./asset-scout/clips.json)。ingest **必须** `--scout-id`；授权由你确认，工具不校验许可文本。

清单 URL / 本地片 → 下载 → 全片 PoseDump → 按样片标准评分裁剪候选：离线工具 [`tools/trajectory-source-ingest/`](../../tools/trajectory-source-ingest/README.md)。

产出落在 `_inbox/`（原片）与 `_candidates/`（候选 mp4 + 评分报告）；**默认不覆盖**正式轨迹 JSON。look-window 已核后用 `--crop-only` 裁到 `_candidates/<scout-id>.mp4` 与 `media/trajectory-source/<exercise>/<scout-id>.mp4`（不打进 App 包，NFR-010）。人工确认后再用下方 `trajectory-extract` / `from-dump`。

### 样片标准（质量门禁）

| 项 | 要求 | 说明 |
|----|------|------|
| 机位 | 单一明确：`side` / `front` / `three_quarter`，文件名带对应标记 | 混拍难裁循环 |
| 时长 | **软偏好 3–40 s**（ingest 评分降权，不是 scout 可圈整段教程）；scout look-window：`reps` **4–15 s**、`hold` **3–8 s**。硬门禁仅约 ≥1.5 s / ≤120 s | 以完整 rep 为准；口播/摆机位不得写入 clips.json |
| 完整 rep | **≥ 2** 次完整 ROM（站立类：stand→bottom→stand） | 仰卧/静力动作按其静息端循环，不套站立垂臂门 |
| 起止 | 该动作的静息端入画开始并结束 | 深蹲只蹲到最低不起身 → 只能镜像补全，精度差 |
| 构图 | 全身入画；关键关节不被遮挡 | 深蹲侧：看清膝髋踝；正：对称。scout：**特写插镜不否决片源，但不得写入 look-window 窗头** |
| 光线 | 均匀、避免强逆光/电视大块高光 | 影响 visibility 与提点稳定 |
| 服装 | 贴身深色更佳 | 宽松衣物抖点 |
| 每动作片数 | **按机位规格 `requiredClipCameras`**（FR-089），不是「侧面 ≥1、正面可选」 | 祖父 10 条维持当时侧片；新动作禁止默认只收侧 |

片源质量**会**影响贴合：本次正面片停在底部未起身，管线用「最低点镜像上行」补全，可用但不如完整 rep。

## 站立参考帧质量（必守，防参考骨畸形）

> 适用于**站立类**动作。臀桥等仰卧动作不要套 `armsDownStand` / 垂臂站立门；授权后为该动作族另开循环检测。

> 真机事故：正面/侧面片源「举手站立」被当成 canonical stand → 参考骨双手上举、躯干拉长。  
> 运行时：`standProgressOf` / `scoreStandPose`；入库：`assertCanonicalStandQuality`。

| 项 | 要求 |
|----|------|
| 垂臂 | **腕中点 y ≥ 肩中点 y**（胸前握持可；过头举手否决） |
| 直立 | 髋–踝足够长；非 bottom；驱动角不宜过低 |
| 禁忌 | 片尾庆祝举手、整理头发、伸懒腰当 stand canonical |
| 取样 | 用 `standProgressOf(traj)`，勿盲目取 t=0 或 t=1 |

**新动作入库 checklist**

0. 机位规格已写入 `camera-planes/specs.json`（FR-089；祖父 10 条跳过）
1. 规格 `requiredClipCameras` 各跑一遍（站立类：`assertCanonicalStandQuality`）
2. 目视 `standProgressOf` 对应帧：垂臂、脚着地
3. 行程帧避免长期过头举手（ingest 会降分）
4. 片源评分含 `armsDownStand`（见 `tools/trajectory-source-ingest`）

## 训练参考驱动（T7-2，供 Plan C 复用）

- `progressByNearestDrive` → 身上用用户实时 Pose 画 2D 骨骼；`canonicalPoseFromUser`（窗内拟合 → 小窗人+2D 骨骼）
- 身上骨：`buildRig3d` + `Reference3DOverlay`；小窗人：`ReferencePersonPip`；整层 GL 失败时身上骨回退 2D
- 深蹲：后台自动识别侧/正（无手动开关）；默认 `squat-side-v1`
- 俯卧撑：front → `support`；side → `upright`
- **已移除**：`anatomyGuide`（Plan A 丰满 2D，用户否决）

## 轨迹辅助校准（T7-3 / FR-069）

离线（不自动覆盖运行时）：

```ts
import { driveDegStats, proposePhaseThresholds, getDemoTrajectory } from '@fitness-coach/core';
const stats = driveDegStats(getDemoTrajectory('squat', 'side'));
const prop = proposePhaseThresholds(stats);
// prop.significant === true 且多机位提议一致时，才改 rules + phase/validate + boundary
```

**2026-08-11 抽查（不改运行时阈值）**

| 轨迹 | standAbove 现状→提议 | bottomBelow 现状→提议 | 结论 |
|------|----------------------|-------------------------|------|
| squat-side-v1 | 160→151 | 100→95 | 与正面冲突，暂不改 |
| squat-front-v1 | 160→149 | 100→110 | 片源含镜像上行，不作全局权威 |
| pushup-side-v1 | 160→157 | 120→115 | Δ 小，暂不改 |

默认仍用 `DEFAULT_SQUAT/PUSHUP_PHASE_CONFIG`；T7-3 交付为**校准工具 + 门禁**，真机对照靠 FR-068 参考骨。

## 与 RULE-BOUNDARY

轨迹校准阈值时：**先改 rules 文档 + 矩阵/sweep，再改代码**；禁止只真机拧参。

## 检验

| VT | 内容 |
|----|------|
| VT-P7-001 | 深蹲/俯卧撑各 ≥1 条清洗轨迹可被 core 加载（L2） |
| VT-P7-002 | 训练参考骨架开关（T7-2） |
| VT-P7-003 | 对照/校准抽测（T7-3） |
