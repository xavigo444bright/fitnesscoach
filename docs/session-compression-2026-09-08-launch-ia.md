# 交接：上线方向 + 2 Tab IA（2026-09-08）

> **新会话第一句请只读进度，不要开工。**  
> 读序：`docs/PRD.md`（**0.6.59**）→ 本文 → `docs/app-ia.md`（0.2.0）→ `design-system/fitness-coach/MASTER.md` → `docs/progress.json`。  
> 读完用几句话确认理解即可。**禁止**立刻改 `apps/mobile`、禁止 arm loop。等用户再说「开始做壳」。

## 产品现在是什么

手机 App **唯一交付**。微信小程序 **2026-09-07 放弃**（`apps/miniprogram` 不维护）。

两块能力并存（OQ-008）：

1. **跟练纠错**（已有）：相机 + MediaPipe + `packages/core` 规则/计数；身上 2D 绿骨；示范窗原片/骨骼。
2. **训记式课表**（规格已定、**未写代码**）：一节课多动作；可不开相机手记组/次/kg。

另要：**账号**（可游客；首发数据只本地，云同步 FR-101 下一版）、**MLS Official App 视觉**（壳层 OLED，不抄商标/比分）。

## 已完成（不要重做）

- 20 条 coachable **App 真机齐**（G4B iPhone 14 Pro，0.6.48 Release）：深蹲、俯卧撑、Scout 10、胸 5、肩 5。
- M0–M6、M12、M13 门禁过。训练页叠加层冻结：身上 2D 骨 + 示范窗；禁止青色 3D 胶囊 / 空网格当成品。
- 暂不扩新动作（ASSET-SCOUT parked）。祖父 10 条不补机位规格。
- 小程序：US-007、MP-FPS、VT-P5、VT-P6-004 取消。

## 规格已定、代码未动

| 项 | 结论 | 文档 |
|----|------|------|
| 底栏 | **只有 2 Tab**（废止 5 Tab / 中间蓝圆） | `docs/app-ia.md` |
| 首页 | 页内 **训练 \| 动作** | 同上 |
| 记录 | 页内 **记录 \| 我的** | 同上 |
| 跟练 | 全屏藏底栏；单动作也挂在一节课上，结束弹组表改次数再填重量 | FR-093 |
| 容量 | 有重量才 `次数×kg`；平板计时不进容量数字 | FR-094 |
| 记训字段 | 组/次/kg/休息/备注/时长/形态摘要；无 RPE | FR-091 |
| 动作范围 | 20 条 + 自定义名（自定义无相机） | FR-091 |
| 还要 | 上次重量、组间倒计时、模板、PR、日历 | FR-095–099 |
| 登录 | Apple / 手机 / 邮箱 / 微信 + 游客 | FR-100 |
| 视觉 | MLS：真黑、白胶囊 CTA、大图、表格式数据；pose 绿黄红不动 | MASTER.md |
| 现 App | 仍是 `App.tsx` 一条栈：库→详情→准备→训练→总结，无底栏 | `apps/mobile/App.tsx` |

## 待办（编码顺序，不要跳）

1. **APP-SHELL** — OLED token + 2 Tab + 把现有跟练迁进栈（下一刀，**未开始**）
2. **APP-LOG-CORE** — 本地课/组模型、容量、持久化
3. **APP-LOG-UI** — 首页·训练组表、FR-093、休息倒计时
4. **记录段** — 列表、日历、PR
5. **模板**
6. **账号** — 可与 4 后半并行；不上传课表
7. **训练页铬** — 按钮变白胶囊；骨骼/纠错不改
8. **APP-DISTRIBUTE** — 用户将**付费**苹果开发者（免费描述文件约至 **2026-09-12**）；TestFlight VT-P4-005b；品牌名/包名 OQ-004 未定（现 `com.fitnesscoach.mobile`）

第二台真机 VT-P4-004 deferred。Android 后接。

## 硬约束

- 业务逻辑只在 `packages/core`。Node：`nvm use 24.18.0`。
- `loop.mode = paused_human`：**勿 arm**。
- 真机返工：先 Node/脚本自检，空网格必须回退胶囊。
- Overlay 空网格禁止藏掉胶囊留空白。
- NFR-010：禁止 scout 整库打进包。
- YouTube 走 ingest 整批，禁止 WebFetch watch 页。
- 不要主动 commit/push。
- 全局已装 skill：`~/.cursor/skills/ui-ux-pro-max/`（改 UI 时读）。

## 本会话改过的文档（无 App 功能代码）

- `docs/PRD.md` 0.6.53→0.6.59（弃小程序、容量/账号、MLS、2 Tab）
- `docs/app-ia.md`、`design-system/fitness-coach/MASTER.md`
- `docs/UI.md`、`docs/ROADMAP.md` Phase 10、`docs/MODULES.md`、`docs/progress.json`
- canvas：`app-launch-status.canvas.tsx`

Git：本地分支 **main**（从 miniprogram spike 改名）。大量未提交改动。远程旧名可能仍在。

## 真机

健身房机 G4B：iPhone 14 Pro，Bundle `com.fitnesscoach.mobile`，Team `GDX7AL5G5F`。
