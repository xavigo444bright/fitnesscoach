---
document: 3d-stack-oq-005
product: fitness-coach
version: 1.0.0
last_updated: 2026-08-13
depends_on:
  - docs/PRD.md
status: decided
---

# OQ-005：训练页 3D 栈选型（T8-1）

> 对应 PRD **0.5.0** FR-068 / FR-080～083。须能被**样片轨迹关节**驱动，优先 Expo Dev Client（SDK 54）。

## 结论

**选定：`expo-gl` + `three.js`（命令式，不用 R3F、不用 expo-three 作为硬依赖）。**

| 项 | 选择 |
|----|------|
| GL 上下文 | `expo-gl` `GLView`（SDK 54 官方，`expo-gl@~16.0.10`） |
| 场景图 | `three@0.166.1` 命令式 `WebGLRenderer` + OrthographicCamera（`@types/three@0.166.0`） |
| 驱动 | 每帧读轨迹取样 `Pose`：身上骨对齐用户；小窗人标准体型 |
| 几何 | 关节球 + 骨段圆柱；肌肉为沿骨胶囊半径（FR-081） |
| 坐标系 | 与 2D 叠加相同的归一化 x/y（y 向下的 Pose 空间在 shader/相机里翻转） |
| 降级 | GL 失败时回退 2D 参考骨（临时），须在 HUD 标明 |

**须重装 Development Build**：`expo-gl` 为原生模块，当前 Dev Client 未编入。Expo Go 不能跑 MediaPipe，不能用来验本 Spike。

## 候选对比

| 方案 | 轨迹关节驱动 | 贴用户画幅 | Expo 54 Dev Client | 肌肉体积 | 结论 |
|------|--------------|------------|---------------------|----------|------|
| **expo-gl + three 命令式** | 每帧设关节 | 正交相机对齐 2D | 官方 GLView | 程序化胶囊 | **选定** |
| Filament (`react-native-filament`) | 可以 | 可以 | SDK 54 + New Arch 有崩溃报告；worklets 依赖重 | 蒙皮 GLB 更强 | 否决（稳定性质疑，重建成本高） |
| `@react-three/fiber` native | 可以 | 可以 | 历史上 expo-gl peer 错配；React 19 需 fiber 9 | 同 three | 否决（多一层不稳定） |
| 烘焙序列帧 / 预渲染 mp4 | 只能 scrub 进度，**不能**按对齐后关节重定向 | 难贴用户体型 | 易 | 观感好但假 | **否决作训练参考**（详情页 FR-064 仍可用） |

## 硬约束（选型过滤器）

1. 输入必须是 FR-067 轨迹取样 + 对齐后的 `Pose`，不是独立动画时间轴。
2. 投影回屏幕的关节 x/y 须与 2D 参考骨一致（FR-080 / FR-082）。
3. 不在 UI 层写相位/计数。
4. 评估动作仅 **squat + pushup**（先 side）。

## 实现落点

| 层 | 路径 |
|----|------|
| Pose→3D 几何 | `packages/render/src/rig3d.ts` |
| GL 绘制 | `apps/mobile/src/components/Reference3DOverlay.tsx` |
| 训练接线 | `DevPoseScreen`：参考开时叠 3D；失败回退 2D |

## 真机 Spike（VT-P8-001）

1. 重装 Dev Client（编入 `expo-gl`）。
2. 打开训练/DevPose，参考开：可见随相位运动的 3D 人体（非 2D 细线）。
3. 参考关：3D 消失，仅用户 2D 骨。
4. 记 FPS（开/关参考各 30s）。

## 若 Spike 失败（须产品签字后再换）

1. 关 New Arch 试 Filament；或  
2. 仅进度 scrub 的预渲染半透明片（**明确降级**，不再称关节驱动）。
