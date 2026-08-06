# 动作库目录（分层）

> 代码真源：`packages/core/src/exercises/catalog.ts`  
> `coachable` = 可训练（规则 + 矩阵 + Ghost + 语音）；`catalog` = 仅浏览。

## 部位

胸 · 肩 · 背 · 下肢 · 核心

## 当前 coachable

| ID | 名称 | 部位 | 详情 demo |
|----|------|------|-----------|
| pushup | 俯卧撑 | 胸 | `pushup.mp4`（见 [demo-assets.md](./demo-assets.md)） |
| squat | 深蹲 | 下肢 | `squat.mp4` |

训练页不叠半透明 Ghost；标准动作为详情页预渲染视频。

## 升级队列（Phase D）

见 `COACHABLE_UPGRADE_QUEUE` / [`UPGRADE-QUEUE.md`](./UPGRADE-QUEUE.md)：

1. glute-bridge（臀桥）
2. lunge（弓步蹲）
3. plank（平板支撑）
4. db-row（哑铃划船）
5. ohp（站姿推举）
6. bench-press（杠铃卧推）

每个升级必须走 RULE-BOUNDARY，禁止只真机拧参。
