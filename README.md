# Fitness Coach（健身动作指导）

通过手机 App 实时校验健身动作并叠加正确动作指导。**唯一交付：iOS / Android App。** 微信小程序已于 2026-09-07 放弃。

## 文档（开发前必读）

| 文档 | 说明 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | **产品需求真源**（当前 **0.6.53**） |
| [docs/MODULES.md](docs/MODULES.md) | 模块依赖与主线 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 可执行路线图 |
| [docs/VERIFICATION.md](docs/VERIFICATION.md) | 检验手册（VT） |
| [docs/progress.json](docs/progress.json) | Loop / 任务队列真源 |
| [docs/exercises/](docs/exercises/) | 动作规则与轨迹管线 |

## 目标平台

- **手机 App**：iOS / Android（React Native + Expo Development Build）
- Web 仅调试 `tools/dev-web`，不上架

## 仓库结构

```
fitness-coach/
├── docs/           # PRD、路线图、动作规则、进度
├── packages/       # core / pose-native / render / ui
├── apps/
│   └── mobile/     # Expo App（唯一产品）
├── tools/          # trajectory-extract / trajectory-source-ingest / …
└── media/          # 示范片源（大视频本地，勿提交）
```

遗留 `apps/miniprogram`、`packages/pose-mp` 不维护。

## 当前状态（2026-09-07）

| 项 | 状态 |
|----|------|
| coachable | 20 条 App 真机齐（深蹲/俯卧撑 + Scout 10 + 胸 5 + 肩 5） |
| 主线 | **App 上线**：付费苹果开发者 + TestFlight / App Store |
| 小程序 | **放弃** |
| 扩库 | 暂不加新动作 |
| SDK | Expo SDK 54；姿态需 **Development Build** |

真源以 `docs/progress.json` 与 PRD frontmatter 为准。

## 快速开始

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24

cd /Users/xavigo4bright/Projects/fitness-coach
pnpm install
pnpm run build

# Metro（Dev Client）
pnpm --filter @fitness-coach/mobile start
# 手机同 Wi-Fi：http://<LAN_IP>:8081

# 原生重建（换原生模块后）
pnpm --filter @fitness-coach/mobile exec expo run:ios --device
# 或 Android：… expo run:android --device
```

## 给 AI Agent

1. 读 `docs/PRD.md`（注意版本与变更记录）
2. 读 `docs/MODULES.md`、对应 VT、`docs/progress.json`
3. Plan C 会话先读 `docs/session-compression-2026-08-12-plan-C.md`
4. 业务逻辑只写在 `packages/core`；引用需求 ID（如 `FR-068`）
