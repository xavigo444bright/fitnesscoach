# 动作库目录（分层）

> 代码真源：`packages/core/src/exercises/catalog.ts`  
> `coachable` = 可训练（规则 + 矩阵 + Ghost + 语音）；`catalog` = 仅浏览。  
> 示范窗主动肌：`catalog.ts` 的 `activeMuscles`（coachable 必填）。squat / glute-bridge / lunge / rdl=`pelvis+thigh`，pushup / db-row / bench-press / pullup / db-fly / dip / incline-pushup / cable-crossover / chest-press-machine=`chest+upperArm`，ohp / lateral-raise / front-raise / rear-delt-fly / face-pull / pike-pushup=`upperArm`，plank=`pelvis`。  
> 片源 scout：[`asset-scout.md`](./asset-scout.md) / [`asset-scout/clips.json`](./asset-scout/clips.json)（FR-087）。  
> 新动作出清单前先写 [`camera-planes.md`](./camera-planes.md)（FR-089）。Scout 10 条为祖父，不补规格；飞鸟按 Phase E 规格接线。

## 部位

胸 · 肩 · 背 · 下肢 · 核心

## 当前 coachable

| ID | 名称 | 部位 | 详情 demo |
|----|------|------|-----------|
| pushup | 俯卧撑 | 胸 | `pushup.mp4`（见 [demo-assets.md](./demo-assets.md)） |
| squat | 深蹲 | 下肢 | `squat.mp4` |
| glute-bridge | 臀桥 | 下肢 | 无详情 demo 片；训练示范窗侧面 `glute-bridge-side-01.mp4` |
| lunge | 弓步蹲 | 下肢 | 无详情 demo 片；训练示范窗侧面 `lunge-side-02.mp4` |
| plank | 平板支撑 | 核心 | 无详情 demo 片；训练示范窗侧面 `plank-side-01.mp4` |
| db-row | 哑铃划船 | 背 | 无详情 demo 片；训练示范窗侧面 `db-row-side-01.mp4` |
| ohp | 站姿推举 | 肩 | 无详情 demo 片；训练示范窗侧面 `ohp-side-01.mp4` |
| bench-press | 杠铃卧推 | 胸 | 无详情 demo 片；训练示范窗侧面 `bench-press-side-01.mp4` |
| rdl | 罗马尼亚硬拉 | 下肢 | 无详情 demo 片；训练示范窗侧面 `rdl-side-01.mp4` |
| pullup | 引体向上 | 背 | 无详情 demo 片；训练示范窗侧面 `pullup-side-01.mp4` |
| db-fly | 哑铃飞鸟 | 胸 | 无详情 demo 片；训练示范窗 3/4 `db-fly-side-01.mp4`（scout `db-fly-three_quarter-01`） |
| dip | 双杠臂屈伸 | 胸 | 无详情 demo 片；训练示范窗 3/4 `dip-side-01.mp4`（scout `dip-three_quarter-01`） |
| incline-pushup | 上斜俯卧撑 | 胸 | 无详情 demo 片；训练示范窗侧面 `incline-pushup-side-01.mp4` |
| cable-crossover | 绳索夹胸 | 胸 | 无详情 demo 片；训练示范窗正面 `cable-crossover-front-01.mp4` |
| chest-press-machine | 坐姿推胸器 | 胸 | 无详情 demo 片；训练示范窗侧面 `chest-press-machine-side-01.mp4` |
| lateral-raise | 哑铃侧平举 | 肩 | 无详情 demo 片；训练示范窗正面 `lateral-raise-front-01.mp4` |
| front-raise | 哑铃前平举 | 肩 | 无详情 demo 片；训练示范窗侧面 `front-raise-side-01.mp4` |
| rear-delt-fly | 俯身飞鸟（后束） | 肩 | 无详情 demo 片；训练示范窗 3/4 `rear-delt-fly-side-01.mp4`（scout `rear-delt-fly-three_quarter-01`） |
| face-pull | 面拉 | 肩 | 无详情 demo 片；训练示范窗 3/4 `face-pull-side-01.mp4`（scout `face-pull-three_quarter-01`） |
| pike-pushup | 派克俯卧撑 | 肩 | 无详情 demo 片；训练示范窗侧面 `pike-pushup-side-01.mp4`（0:02–0:11） |

训练页不叠半透明 Ghost；标准动作为详情页预渲染视频。当前 coachable **App 真机齐**（VT-P6-001～003/005～023，2026-09-07）。暂不扩新动作。小程序 VT-P6-004 **已取消**。

## 升级队列

见 `COACHABLE_UPGRADE_QUEUE` / [`UPGRADE-QUEUE.md`](./UPGRADE-QUEUE.md)。

- **Phase D** Scout 10 条已接线并真机齐（祖父，不补机位规格；含 VT-P6-006～013）。
- **Phase E** 胸部 5 条均已接线并 **coachable**（VT-P6-014～018 通过）。
- **Phase F** 肩 5 条均已接线并 **coachable**（VT-P6-019～023 通过）。

每个升级必须走 RULE-BOUNDARY，禁止只真机拧参。
