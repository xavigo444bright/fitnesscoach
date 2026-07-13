# Phase 0 技术 Spike 报告

> 在 Phase 0 完成后填写。结论需回写 `docs/PRD.md` §5.3 与变更记录。

## 测试环境

| 项 | App | 小程序 |
|----|-----|--------|
| 测试日期 | 2026-07-11 | |
| 设备型号 | G4B（iPhone 14 Pro） | |
| 系统版本 | iOS 26.5 | |
| 微信基础库 | — | |
| Expo SDK | 54 + Development Build | — |

## App Spike（T0A）

| 指标 | 结果 | 是否达标 |
|------|------|----------|
| 姿态方案 | MediaPipe Pose（`@thinksys/react-native-mediapipe`） | ✅ |
| 关键点 | 33 | ✅ ≥17（VT-P0A-004） |
| FPS | 20 | ✅ ≥15（VT-P0A-006） |
| 首次加载 | Development Build 冷启动可接受 | ✅ |
| 延迟体感 | 骨骼跟手可接受 | ✅ |

> **说明**：MediaPipe 需 **Development Build**，Expo Go 无法运行原生姿态模块。构建命令见 README。

## 小程序 Spike（T0B）

| 方案 | FPS | 延迟 | 包体 | 结论 |
|------|-----|------|------|------|
| A: TFJS MoveNet | | | | 待测 |
| D: 云端 API | | | | 待测 |

**选定方案**：待 M0-T5/T6

## 决策

- [x] 继续 App 主线（MediaPipe + Dev Client）
- [ ] 小程序方案：A / B / C / D
- [ ] 是否更新 PRD 至 0.2.0（App 方案可先记入变更记录）

## 风险与备注

- iOS 真机开发依赖 Xcode Platforms（匹配系统版本）+ Development Team 签名
- `ENABLE_USER_SCRIPT_SANDBOXING` 需设为 NO，否则 Expo 构建脚本被沙箱拦截
- App Store Expo Go 为 SDK 54；姿态推理必须用 Development Build，不能依赖 Expo Go
