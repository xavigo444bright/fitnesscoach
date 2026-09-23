# apps/mobile — Fitness Coach（Expo Dev Client / EAS）

姿态推理依赖原生 MediaPipe，**不能用 Expo Go** 跑训练页，必须 Development Build 或 EAS 独立包。

## 日常开发（本机已装 Dev Client）

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
cd /Users/xavigo4bright/Projects/fitness-coach
pnpm install
pnpm --filter @fitness-coach/mobile start   # 或: pnpm --filter @fitness-coach/mobile start -- --dev-client
```

真机打开已安装的 Dev Client，扫码连接 Metro。若 Metro 因 `EMFILE` 退出，在启动前执行 `ulimit -n 65536`。

新增原生依赖（如 `expo-speech`、`expo-av`、**`expo-gl`**）后若运行时报模块缺失，需重装 Dev Client：

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
cd apps/mobile && npx expo run:ios --device G4B
```

详情页 3D 示意视频：放入 `assets/demos/*.mp4`，并在 `src/demoAssets.ts` 取消对应 `require` 注释。见 `docs/exercises/demo-assets.md`。

本地重装 Dev Client：

```bash
cd apps/mobile
npx expo run:ios --device
# 或
npx expo run:android --device
```

## 内测分发（APP-DISTRIBUTE / VT-P4-005）

配置见同目录 [`eas.json`](./eas.json)：

| Profile | 用途 |
|---------|------|
| `development` | Dev Client（仍需连 Metro） |
| `preview` | 独立包内测（JS 打进包，**无需 Metro**）；Android 出 APK |
| `production` | 商店 / TestFlight（`distribution: store`） |

**推荐执行顺序：先 iOS TestFlight，再 Android APK。**  
（配置与文档已就绪；云端 build 需你本地登录后执行，仓库不代跑。）

### 0. 前置条件

- [Expo](https://expo.dev) 账号
- **iOS**：付费 [Apple Developer](https://developer.apple.com) + [App Store Connect](https://appstoreconnect.apple.com) 中已有 App（Bundle ID = `com.Myfitco.mobile`，Team `93UHA7C4LM`）
- **Android**：包名与 iOS 相同，`com.Myfitco.mobile`。可用 Google 账号登录 EAS 打 preview APK（上架 Play 另需商店账号）

### 1. 关联 EAS 项目（首次）

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
cd /Users/xavigo4bright/Projects/fitness-coach/apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init` 会把 `extra.eas.projectId` 写入 [`app.json`](./app.json)。**不要手填假 ID。**

### 2. iOS → TestFlight

```bash
cd apps/mobile
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios --latest
```

然后在 App Store Connect → TestFlight：

1. 等待处理完成
2. 添加内部/外部测试员
3. 测试员用 TestFlight App 安装

验收：他人安装后**无需开电脑 Metro**，能进动作库 → 深蹲 / 俯卧撑训练。

### 3. Android → 内测 APK

```bash
cd apps/mobile
npx eas-cli@latest build --profile preview --platform android
```

构建完成后在 Expo 控制台或 CLI 输出中复制安装链接，发给测试员（需允许「未知来源」安装，视机型而定）。

验收同 iOS：独立运行、动作库与训练可用。

### 4. 常见失败

| 现象 | 处理方向 |
|------|----------|
| 证书 / 描述文件错误 | `eas credentials` 按提示重配；确认 Team 与 Bundle ID |
| Bundle ID 冲突 | ASC / Play 已占用其它账号下的同名 ID |
| 训练页原生模块缺失 | 确认打的是 EAS/Dev Client，不是 Expo Go；preview/production 需完整原生依赖 |
| 仍提示连 development server | 误装了 `development` profile；内测应使用 `preview` / `production` |

### 5. 状态

| 项 | 状态 |
|----|------|
| `eas.json` + 分发文档 | 已就绪（VT-P4-005a） |
| 云端出包 / 他人可装 | 待登录后执行（VT-P4-005b） |
| 商店上架材料（截图、隐私政策 URL 等） | 未做 |

## 隐私

见仓库 `docs/privacy-notice.md`；App 动作库页有本地推理说明。
