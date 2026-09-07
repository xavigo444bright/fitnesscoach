# 交接：M13-GATE 通过（2026-08-21）

> **新对话入口**。先读：`docs/PRD.md`（**0.6.15**）→ 本文 → `docs/3d-human-figure-plan.md` → `docs/progress.json`。  
> 真机 **M13-GATE 通过**（G4B / Dev Client `com.fitnesscoach.mobile`）。VT-P9-001/002/003 齐。

## 产品形态（已冻结，禁止回退）

| 层 | 做什么 | 不做什么 |
|----|--------|----------|
| **身上 2D 骨骼** | 用户实时 MediaPipe Pose；细绿/黄/红线 + 白边圆点；含踝/踵/脚尖 | 不播样片、不换成示范姿势、不叠青色 3D 胶囊 / xbot.glb、**不画肌群色块** |
| **示范窗「样片」** | 循环播参考库原片（`source.label`）；随 side/front 换片后仍循环；点画面暂停/播放；倍速 0.5/1/1.5/2 | 不用轨迹骨骼冒充原片。切「骨骼」时**不停掉** AVPlayer |
| **示范窗「骨骼」** | `canonicalPoseFromUser` 拟合用户当前 Pose；浅灰人体底 + catalog 主动肌小色块；绿骨在上 | 不跟样片初始姿势；侧面只画近镜头一侧肢体 |

窗：178×297，可拖全屏（不吸边）；收起折出屏外，留「示」拉开。

绘制 vis **0.2** / 校验 vis **0.5**。业务相位/计数只在 `packages/core`。

## 已完成（到 M13）

- **可训练**：深蹲、俯卧撑（side 先，front 样片已入库）
- **门禁**：M0～M6、M12、**M13** 均通过
- **训练页**：动作库 → 详情 → 准备 → 训练（骨骼/反馈/计数/语音/示范窗）→ 总结
- **片源管线（逻辑）**：`trajectory-extract` + `trajectory-source-ingest`（许可后才下载）

## 硬约束

- 不要 Expo Go；Dev Client `http://<LAN>:8081`（现网 `192.168.10.21:8081`）
- 改 `core` / `render` / `ui` / `pose-native` 后必须 **build**（Metro 走 dist）
- 真机返工先 `pnpm --filter @fitness-coach/mobile check:reference`
- NFR-010：禁止把参考库整库打进包；运行时只解码当前一条
- 未要求禁止 arm loop

## 新对话第一件事（先讨论，再写动作）

**ASSET-SCOUT：批量扩动作库能力。** 充分探讨后再开始臀桥（`glute-bridge`）。

意向（未定稿，禁止未授权下载）：

1. 按规则选 YouTube 候选（模型出清单，不逛着下片）
2. 每个动作 × 站位：链接 + 时间点
3. **你**拿版权
4. 状态 `licensed` 后才 ingest（已有 `tools/trajectory-source-ingest`）
5. 产出示范窗原片 + PoseDump + 轨迹；**不能**替代 RULE-BOUNDARY

已有后半段：`docs/exercises/trajectory-pipeline.md`、`tools/trajectory-source-ingest/README.md`。缺前半段 scout 清单与版权门闩。

视频只产素材。每个 coachable 仍要 `*-rules.md` → 矩阵 → core → App。

## 不要做

- 未授权 yt-dlp / 把样片叠回用户身上 / 再叠青色 3D 胶囊
- 没讨论完 ASSET-SCOUT 就实现臀桥或批量进轨迹
- 把校验阈值降到 0.5 以下（只放宽绘制）
