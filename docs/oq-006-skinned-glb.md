---
document: oq-006-skinned-glb
product: fitness-coach
version: 0.2.0
last_updated: 2026-08-16
depends_on:
  - docs/PRD.md
  - docs/3d-stack-oq-005.md
  - docs/3d-human-figure-plan.md
status: parked
---

# OQ-006：蒙皮 GLB 重定向（已停）

> 2026-08-16 产品改走 **身上 3D 骨 + 固定位小窗人**（PRD 0.6.1 / T9-2）。本 Spike 不再阻塞训练参考。

## 结论

| 项 | 状态 |
|----|------|
| 仓库 `apps/mobile/assets/reference/xbot.glb` | **否决进训练路径**：Beta_Surface 顶点全 0 |
| 把完整人叠在摄像头上 | **否决**：expo-gl `drawingBuffer` 是 viewport 快照，按它/按 layout×dpr 反复 `setSize` 会把人画进左下角或比例乱跳 |
| 蒙皮 GLB 作为以后可选增强 | 可另开任务；须本地验证顶点非空，且不要叠回全屏相机缓冲 |

T9-2 主路径改为：小窗内程序化体积人，由 `canonicalPoseFromTrajectory` 驱动。
