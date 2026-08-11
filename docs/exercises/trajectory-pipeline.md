# 示范轨迹管线（FR-067～069）

> 当前开发主线：**扒片/导入视频 → 提轨迹 → 训练参考骨架与对照**。  
> 解剖 3D 详情 mp4（FR-064）为 P2，不阻塞本管线。

## 目标

提高动作进行中的指导精度：示范对照、相位/进度对齐、（下一步）阈值校准。

## 阶段

| 阶段 | 内容 | 对应需求 | 状态 |
|------|------|----------|------|
| T0 | 轨迹格式约定 + 目录 | FR-067 | **done**（`packages/core/src/trajectory`） |
| T1 | 离线提取：视频/PoseDump → 清洗/单 rep 循环 | FR-067 | **done**（深蹲/俯卧撑 side+front 真片） |
| T2 | App 训练：按相位/进度叠加参考骨架 | FR-068 | **done**（VT-P7-002 真机通过） |
| T3 | 用轨迹分布校准或进度对照驱动角（须更新矩阵/RULE-BOUNDARY） | FR-069 | **逻辑 done**（待真机 VT-P7-003；未改运行时阈值） |
| — | 详情预渲染解剖片 | FR-064 | **P2 延后** |

## 首批动作

1. `squat`（侧面）→ `packages/core/trajectories/squat-side-v1.json`
2. `pushup`（侧面 + 正面）→ `pushup-side-v1.json` / `pushup-front-v1.json`（真片，非 synthetic）

运行时：`getDemoTrajectory('squat' | 'pushup')`。

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

# 从 PoseDump 提取
pnpm --filter @fitness-coach/trajectory-extract extract -- from-dump \
  --input path/to/dump.json --exercise squat --out packages/core/trajectories
```

管线步骤（`extractDemoTrajectory` / `extractFromPoseDump`）：

1. 过滤低 visibility 帧  
2. 三点滑动平滑  
3. 相位机找完整 `stand→…→stand` 循环（取最长或指定 rep）  
4. 归一化 `t∈[0,1]` 并标注 `phase` / `driveDeg`

### 片源目录

`media/trajectory-source/<exercise>/`（如 `squat/squat-side-01.mp4`）。大文件 gitignore。

### 片源获取（ingest）

可商用 URL / 本地片 → 下载 → 全片 PoseDump → 按样片标准评分裁剪候选：离线工具 [`tools/trajectory-source-ingest/`](../../tools/trajectory-source-ingest/README.md)。

产出落在 `_inbox/`（原片）与 `_candidates/`（候选 mp4 + 评分报告）；**默认不覆盖**正式轨迹 JSON。人工确认后再用下方 `trajectory-extract` / `from-dump`。

### 样片标准（质量门禁）

| 项 | 要求 | 说明 |
|----|------|------|
| 机位 | 单一明确：`side` 或 `front`，文件名带 `-side-` / `-front-` | 混拍难裁循环 |
| 时长 | **软偏好 3–40 s**；硬门禁仅约 ≥1.5 s / ≤120 s | 以完整 rep 为准，不因不够 8s 否决短片多 rep |
| 完整 rep | **≥ 2** 次 stand→bottom→stand | 至少 1 次干净；多 1 次备选 |
| 起止 | **站立入画开始，站立结束** | 只蹲到最低不起身 → 只能镜像补全，精度差 |
| 构图 | 全身入画；关键关节不被遮挡 | 深蹲侧：看清膝髋踝；正：对称 |
| 光线 | 均匀、避免强逆光/电视大块高光 | 影响 visibility 与提点稳定 |
| 服装 | 贴身深色更佳 | 宽松衣物抖点 |
| 每动作片数 | 侧面 ≥1（主）；正面可选 ≥1 | 深蹲已收 side+front |

片源质量**会**影响贴合：本次正面片停在底部未起身，管线用「最低点镜像上行」补全，可用但不如完整 rep。

## 站立参考帧质量（必守，防参考骨畸形）

> 真机事故：正面/侧面片源「举手站立」被当成 canonical stand → 参考骨双手上举、躯干拉长。  
> 运行时：`standProgressOf` / `scoreStandPose`；入库：`assertCanonicalStandQuality`。

| 项 | 要求 |
|----|------|
| 垂臂 | **腕中点 y ≥ 肩中点 y**（胸前握持可；过头举手否决） |
| 直立 | 髋–踝足够长；非 bottom；驱动角不宜过低 |
| 禁忌 | 片尾庆祝举手、整理头发、伸懒腰当 stand canonical |
| 取样 | 用 `standProgressOf(traj)`，勿盲目取 t=0 或 t=1 |

**新动作入库 checklist**

1. 侧/正（若有）各跑一遍：`assertCanonicalStandQuality(getDemoTrajectory(...))`
2. 目视 `standProgressOf` 对应帧：垂臂、脚着地
3. 行程帧避免长期过头举手（ingest 会降分）
4. 片源评分含 `armsDownStand`（见 `tools/trajectory-source-ingest`）

## 训练参考骨架（T7-2 / FR-068）

- `progressByNearestDrive` + `alignGhostToUser` → `referencePoseFromTrajectory(cameraHint)`
- **参考开**：青色 **anatomy guides**（`buildAnatomyGuideScene`：脊柱弧 / 头轮廓 / 加粗肢段 / 髋弧）+ 用户仅黄/红纠错色点；仍是 **2D FR-068**，不是 FR-064 预渲染 3D，也不是实时解剖人（方案 C）
- **参考关**：完整用户绿白骨
- 深蹲默认「自·侧 / 自·正」按肩髋跨度自动切正面/侧面轨迹；按钮循环 自动→侧→正→自动
- 侧面默认 `squat-side-v1`（垂臂）；v2 举手过多仅备查
- 俯卧撑：正面 `support`（肩宽钉肩）、侧面 `upright`（肩/髋–踝钉踝）；机位须与身体朝向一致

### A 方案真机评估（深蹲 + 俯卧撑）

| 动作 | 机位 | 看什么 |
|------|------|--------|
| squat | side/front | 脊柱弧随下蹲变化；头轮廓不炸；比例接近身体 |
| pushup | side | 肩–髋–踝接近水平 plank 链，非竖直火柴人 |
| pushup | front | 肩宽/双手落地感；非胸口小团 |

观感可接受 → 继续 A 扩动作；仍差很远 → 再开 PRD 讨论方案 C。

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
