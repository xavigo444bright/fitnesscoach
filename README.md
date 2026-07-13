# Fitness Coach（健身动作指导）

通过手机 App 与微信小程序，实时校验健身动作并叠加正确动作动画指导。

## 文档（开发前必读）

| 文档 | 说明 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | **产品需求真源** — 人与 AI 均须先读 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 可执行路线图（移动端 + 小程序） |
| [docs/exercises/](docs/exercises/) | 各动作校验规则 |

## 目标平台

- **手机 App**：iOS / Android（React Native + Expo）
- **微信小程序**

## 仓库结构（规划）

```
fitness-coach/
├── docs/           # PRD、路线图、动作规则
├── packages/       # 共享逻辑（core、pose、render）
├── apps/
│   ├── mobile/     # Expo App
│   └── miniprogram/# 微信小程序
└── tools/
    └── dev-web/    # 可选：调试 core
```

## 当前状态

- **模块**：M0 工程基建（进行中）
- **已完成**：M0-T1（monorepo）、M0-T2（Expo 可启动）、M0-T3（摄像头预览 ✅）
- **下一步**：M0-T4 — MediaPipe 姿态 Spike（需 Development Build，**不能用 Expo Go**）
- **SDK**：Expo SDK 54（与 App Store Expo Go 对齐）

## 快速开始

```bash
# 若终端找不到 node，先加载 nvm
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24

cd /Users/xavigo4bright/Projects/fitness-coach
pnpm install
pnpm run build

# 启动 App
pnpm --filter @fitness-coach/mobile start

# M0-T4 姿态 Spike（MediaPipe，需 Development Build，不能用 Expo Go）
pnpm --filter @fitness-coach/mobile exec expo run:ios --device
# 或 Android：pnpm --filter @fitness-coach/mobile exec expo run:android --device
```

## 给 AI Agent

1. 阅读 `docs/PRD.md`
2. 阅读 `docs/ROADMAP.md`
3. 按当前 Phase 执行任务，引用需求 ID（如 `FR-041`）
