# Fitness Coach（健身动作指导）

通过手机 App 与微信小程序，实时校验健身动作并叠加正确动作指导。

## 文档（开发前必读）

| 文档 | 说明 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | **产品需求真源**（当前 **0.4.0**） |
| [docs/MODULES.md](docs/MODULES.md) | 模块依赖与主线 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 可执行路线图 |
| [docs/VERIFICATION.md](docs/VERIFICATION.md) | 检验手册（VT） |
| [docs/progress.json](docs/progress.json) | Loop / 任务队列真源 |
| [docs/exercises/](docs/exercises/) | 动作规则与轨迹管线 |
| [docs/session-compression-2026-08-12-plan-C.md](docs/session-compression-2026-08-12-plan-C.md) | **下一会话入口（Plan C）** |

## 目标平台

- **手机 App**：iOS / Android（React Native + Expo Dev Client）
- **微信小程序**（FPS 攻坚已暂停，见 backlog `MP-FPS`）

## 仓库结构

```
fitness-coach/
├── docs/           # PRD、路线图、动作规则、进度
├── packages/       # core / pose-native / render / ui
├── apps/
│   ├── mobile/     # Expo App（主阵地）
│   └── miniprogram/# 微信小程序
├── tools/          # trajectory-extract / trajectory-source-ingest / …
└── media/          # 示范片源（大视频本地，勿提交）
```

## 当前状态（2026-08-12）

| 项 | 状态 |
|----|------|
| 模块门禁 | M0–M6 **done**（App 深蹲闭环、俯卧撑、语音、动作库等） |
| 主线 | **M11 轨迹 + Plan C（FR-068 3D 骨骼+肌肉）** |
| 轨迹 FR-067 | **done**（深蹲/俯卧撑真片轨迹可加载） |
| 参考层 FR-068 | 2D 观感已否决；**下一任务 T8-1：3D 栈选型与 Spike** |
| FR-069 / VT-P7-003 | 校准工具已有；真机抽测可延后，**不阻塞 Plan C** |
| 小程序 | 壳可用；原生 FPS 攻坚 **parked** |
| SDK | Expo SDK 54；姿态需 **Development Build**（不能 Expo Go） |

真源以 `docs/progress.json` 与 PRD frontmatter 为准；本表若冲突以二者为准。

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
