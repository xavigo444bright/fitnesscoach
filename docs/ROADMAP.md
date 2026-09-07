---
document: ROADMAP
product: fitness-coach
version: 0.1.0
status: draft
last_updated: 2026-09-08
depends_on: docs/PRD.md
target_platforms:
  - mobile_app
---

# 健身动作指导 — 可执行路线图（App 上线）

> **给 AI Agent**：执行开发前读 `docs/PRD.md`、`docs/MODULES.md`、`docs/VERIFICATION.md`。微信小程序已于 **2026-09-07 放弃**。

## 总览

| 项 | 内容 |
|----|------|
| 最终交付 | 手机 App（iOS/Android）上架。小程序已取消 |
| 默认技术栈 | React Native Expo + 共享 `packages/core` |
| 当前动作 | 20 条 coachable，App 真机齐；暂不扩库 |
| 当前主线 | **APP-SHELL**（2 Tab）→ 课表 → 账号；分发并行。暂不扩库 |

**与 Web 路线的区别**：Web 不作为交付物，仅可选用于 `tools/dev-web` 调试 core 逻辑；所有里程碑以真机为准。

---

## 里程碑

| 里程碑 | 周次 | 交付物 | 验收 |
|--------|------|--------|------|
| M0 | W1 末 | 双平台技术 Spike 报告 | App + 小程序均能拿到关键点 |
| M1 | W4 末 | App 深蹲纠错闭环 | 真机：半蹲/内扣/标准蹲反馈正确 |
| M2 | W6 末 | App ghost + 计数 + 总结 | 真机完整练 5 rep |
| M3 | W8 末 | App MVP 可内测 | TestFlight / APK 分发 |
| M4 | — | 小程序深蹲闭环 | **已取消（2026-09-07）** |
| M5 | — | 双端 + 俯卧撑 | **改为仅 App；俯卧撑已过** |

---

## Phase 0：双平台技术验证（W1，5 天）

**目标**：验证 App 与小程序上「摄像头 → 关键点 → 可接受 FPS」是否可行。

### 0A — 手机 App Spike（3 天）

| 任务 ID | 任务 | 验收 |
|---------|------|------|
| T0A-1 | `npx create-expo-app apps/mobile` | 模拟器启动 |
| T0A-2 | 集成 `expo-camera`，全屏预览 | 真机前后摄可用 |
| T0A-3 | 集成 MediaPipe Pose 或 ML Kit | 33/17 点输出 |
| T0A-4 | 简单 Canvas/Skia 绘制骨骼 | 跟手 |
| T0A-5 | 记录 FPS | ≥15 FPS（中端机） |

### 0B — 微信小程序 Spike（历史）

**2026-09-07 起已取消跟进。** 当时实测见 `docs/spike-report.md`。

### Phase 0 门禁

- [x] App Spike 通过
- [x] ~~小程序 FPS ≥10~~ **已取消（2026-09-07）**

**交付物**：`docs/spike-report.md`（FPS、机型、选定方案）

---

## Phase 1：Monorepo 与共享 Core（W2，5 天）

**目标**：业务逻辑只写一次，供 App 使用。

| 任务 ID | 任务 | 验收 |
|---------|------|------|
| T1-1 | 初始化 monorepo（pnpm workspace 或 turborepo） | `packages/core` 可被引用 |
| T1-2 | `packages/core/angles.ts` | 单元测试通过 |
| T1-3 | `packages/core/validate.ts` + 类型 | 单元测试通过 |
| T1-4 | `packages/core/phase.ts` | 深蹲相位状态机测试 |
| T1-5 | `packages/core/repCounter.ts` | 5 rep 模拟数据测试 |
| T1-6 | `docs/exercises/squat-rules.md` → `squat.ts` | 规则与文档一致 |
| T1-7 | 可选：`tools/dev-web` 仅调试 core | 浏览器里跑 validate |

**交付物**：`packages/core` 测试覆盖率 >80%（核心模块）

---

## Phase 2：App 姿态管线（W3，5 天）

**目标**：App 端稳定输出平滑 landmarks 到 core。

| 任务 ID | 任务 | 验收 |
|---------|------|------|
| T2-1 | `packages/pose-native` 封装 detect API | 统一接口 |
| T2-2 | One Euro Filter 平滑 | 抖动减轻 |
| T2-3 | visibility 过滤 | 低置信度不参与 |
| T2-4 | 分辨率自适应（720p → 480p 降级） | 低端机 FPS 达标 |
| T2-5 | 接入 `packages/core` 实时校验 | 调试面板显示角度 |

**交付物**：App 调试页：摄像头 + 角度 + validation status

---

## Phase 3：App 训练体验 UI（W4–W5，10 天）

**目标**：完成 PRD 中 App 端 P0 页面与反馈。

### W4：反馈层

| 任务 ID | 任务 | 对应 PRD |
|---------|------|----------|
| T3-1 | `packages/render` 骨骼绘制 | FR-060, FR-061 |
| T3-2 | 关节颜色编码 | FR-061 |
| T3-3 | FeedbackBar 文字提示 | FR-063, FR-045 |
| T3-4 | 防抖 + 冷却 | FR-042, FR-043 |
| T3-5 | 站位引导 | FR-022 |

### W5：动画 + 计数 + 页面流

| 任务 ID | 任务 | 对应 PRD |
|---------|------|----------|
| T3-6 | Ghost 关键帧 + 插值 | FR-064, FR-065 |
| T3-7 | Rep 计数 UI | FR-051 |
| T3-8 | PG-001–PG-005 页面流 | §9 |
| T3-9 | 倒计时 + 结束总结 | FR-070, FR-072 |

**M1 验收（W4 末）**：真机深蹲纠错
**M2 验收（W6 末）**：真机完整训练循环

---

## Phase 4：App 打磨与内测（W7–W8，10 天）

| 任务 ID | 任务 | 验收 |
|---------|------|------|
| T4-1 | 弱光提示 | FR-023 |
| T4-2 | 严格度设置 | FR-074 |
| T4-3 | 本地历史 20 条 | FR-073 |
| T4-4 | iOS + Android 各 3 款真机测试 | 测试矩阵表 |
| T4-5 | EAS Build → TestFlight / APK | 可分发 |
| T4-6 | 隐私政策文案（本地推理） | 上架准备 |

**M3 验收（W8 末）**：内测链接可安装，深蹲全流程无阻断

---

## Phase 5：微信小程序移植 **已取消（2026-09-07）**

不再排期。T5-1～T5-6 作废。

---

## Phase 6：动作扩展（App）

| 任务 ID | 任务 | 验收 |
|---------|------|------|
| T6-1 | 俯卧撑规则 + keyframes | **done** |
| T6-2 | App 接入俯卧撑 | **done** |
| T6-3 | ~~小程序接入俯卧撑~~ | **已取消** |
| T6-4 | 动作库 UI | **done**（20 条 coachable） |
| T6-5 | 语音反馈 | **done** |
| T6-6 | 历史趋势页 | P2，非上线阻塞 |

当前 20 条 App 真机齐。**暂不扩新动作**。下一主线 Phase 4 分发 / 上架。

---

## Phase 7：示范轨迹管线（App / Dev Client）

> PRD 0.3.2→0.4.0：FR-067～069 落地；2D 参考观感否决后主线转入 Phase 8。

| 任务 ID | 任务 | 验收 | 状态 |
|---------|------|------|------|
| T7-1 | 轨迹格式 + 离线提取（深蹲/俯卧撑各 ≥1） | FR-067；VT-P7-001 | done |
| T7-2 | 轨迹→训练参考取样/对齐（可开关） | VT-P7-002（逻辑通过；观感否决） | done（逻辑） |
| T7-3 | 轨迹辅助校验/阈值校准（矩阵同步） | FR-069；VT-P7-003 | partial（不阻塞 C） |
| T7-4 | （延后）详情预渲染 mp4 | FR-064 | deferred |

## Phase 8：训练页 3D 参考 Plan C（**done**）

> PRD **0.5.x**：FR-068/080～083。评估动作 squat + pushup side。OQ-005：expo-gl + three。M12-GATE **通过（2026-08-15）**。

| 任务 ID | 任务 | 验收 | 状态 |
|---------|------|------|------|
| T8-1 | 3D 栈选型 Spike（expo-gl + three） | OQ-005 落盘；VT-P8-001 | **done** |
| T8-2 | 轨迹关节 → 3D rig（squat side） | VT-P8-002 | **done** |
| T8-3 | 简化肌肉/体积 + 画幅对齐 | 用户目视可接受 | **done** |
| T8-4 | pushup side；开关与性能 | VT-P8-003/004 | **done** |

**本阶段验收**：深蹲 + 俯卧撑侧面 3D 参考可用；G4B FPS ≈30。不验收第三动作。

## Phase 9：轨迹驱动人形 + 肌群（**done**）

> PRD **0.6.16**：**M13-GATE 通过**。ASSET-SCOUT 清单已落（10 动作）。等你确认新片授权后再臀桥。交接 `docs/session-compression-M13-GATE.md`、`docs/exercises/asset-scout.md`。

| 任务 ID | 任务 | 验收 | 状态 |
|---------|------|------|------|
| T9-1 | 程序化补全头/胸/骨盆/手足 | 目视更像人（VT-P9-001） | **done**（签字放行：分块真机仍不明显） |
| T9-2 | 2D 骨骼（身）+ 示范窗原片/骨骼 + 收起 | 默认识库原片循环；可暂停/调速；可切骨骼跟人；可收起拉开（VT-P9-003） | **done**（2026-08-19 通过） |
| T9-3 | 简化肌群色块 / 主动肌强调 | 目视可接受（VT-P9-002） | **done**（2026-08-21 通过） |

## Phase 10：壳 + 课表 + 账号（上线范围）

> 真源 `docs/app-ia.md`。视觉 MLS。跟练叠加层不重做。

| 任务 ID | 波次 | 验收 | 状态 |
|---------|------|------|------|
| T10-1～5 | APP-SHELL | **2 Tab** + 页内分段 + 旧跟练栈仍可走通 | planned |
| T11-1～4 | APP-LOG-CORE | 本地课表模型 + 容量公式 + 持久化 | planned |
| T12-1～5 | APP-LOG-UI | 无相机记一节课；跟练写入组表 | planned |
| T13 | APP-HOME-HIST | 首页英雄卡、日历、PR | planned |
| T14 | APP-TEMPLATE | 保存/套用模板 | planned |
| T15 | APP-ACCOUNT | 游客 + 四登录，不上传 | planned |
| T16 | APP-TRAIN-CHROME | 训练页铬 MLS 化，叠加层不变 | planned |
| T4-5 | APP-DISTRIBUTE | TestFlight | in_progress |

---

## 按周日历（单人全职）

| 周 | Phase | 本周必达 | 周末演示 |
|----|-------|----------|----------|
| W1 | P0 | App + 小程序 Spike | Spike 报告 |
| W2 | P1 | core 包 + 深蹲规则单测 | 测试全绿 |
| W3 | P2 | App pose 管线 + 调试页 | 真机看角度 |
| W4 | P3 | 彩色骨骼 + 文字反馈 | M1：纠错 |
| W5 | P3 | ghost + 计数 + 页面 | 完整练一组 |
| W6 | P3 | 总结页 + bugfix | M2 录屏 |
| W7 | P4 | 弱光 + 设置 + 历史 | 内测预备 |
| W8 | P4 | 多机测试 + 打包 | M3 内测包 |
| W9–W14 | — | ~~小程序移植~~ | **已取消**；App 动作库已完成 |

---

## 每周例行

```
周一   ：读 PRD 变更；更新任务勾选；定 3 个必达
周二–四 ：开发 + 真机自测（每天至少 15min 真机）
周五   ：录验收视频；更新 spike/测试矩阵；提交周报
```

---

## 测试矩阵（随 Phase 4 填写）

> **M6-T4 临时签字（2026-07-25）**：当前仅 1 台真机，先记实值放行；`VT-P4-004` 完整 ≥2～3 台矩阵 **延期**，若 `M6-GATE` / 上架前依赖再补测。

| 机型 | 系统 | App FPS | 深蹲计数 | 备注 |
|------|------|---------|----------|------|
| iPhone 14 Pro（G4B） | iOS（开发机） | ≥15 | OK | 唯一真机；临时签字 |
| （待补）第二台 | — | — | — | 上架前 VT-P4-004 |

---

## 任务进度（复制跟踪）

```
Phase 0:
- [ ] T0A App Spike
- [ ] T0B 小程序 Spike
- [ ] Spike 报告

Phase 1:
- [ ] T1 core 包

Phase 2:
- [ ] T2 App pose 管线

Phase 3:
- [ ] T3 App 完整 UI

Phase 4:
- [ ] T4 App 内测

Phase 5:
- [x] T5 小程序 — **已取消 2026-09-07**

Phase 6:
- [ ] T6 扩展
```

---

## 下一步

读 `docs/app-ia.md`，从 **T10-1**（OLED tokens）开始。不要先做账号或模板。
