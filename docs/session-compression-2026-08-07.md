# Session 压缩交接 — 2026-08-07（App 能力 + 轨迹主线）

> 新对话请先读：`docs/PRD.md`（**0.3.2**）→ `docs/MODULES.md`（M11）→ `docs/exercises/trajectory-pipeline.md` → `docs/progress.json`。  
> 本文件是上一长会话的进度摘要，**不是**需求真源。

---

## 一、一句话状态

**App（Dev Client 自用）**：深蹲 + 俯卧撑可教练；语音 OK；分部位动作库已分层；训练页已去掉手调 Ghost。  
**当前主线**：示范视频 **提轨迹 → 训练参考骨架/对照**（FR-067～069 / T7-1→T7-3）。  
**延后**：详情页解剖 3D mp4（FR-064 P2）、TestFlight 出包、小程序 FPS、新动作升级（臀桥等）。

---

## 二、产品决策（已定）

| 决策 | 内容 |
|------|------|
| 分发 | 暂不 TestFlight；只本机 Dev Client（`APP-DISTRIBUTE` = configured） |
| 小程序 | `MP-FPS` **parked**（交接见 `session-compression-MP-FPS.md`） |
| 动作库 | 分层 `coachable` / `catalog`，按 **胸/肩/背/下肢/核心** |
| 示意视觉 | 用户不要训迹式半透明骨架当「标准示意」；解剖 3D 成片 **P2 延后** |
| 训练精度 | **优先**扒片/导入视频 → 提轨迹 → 训练中参考骨架 + 后续阈值对照（不做先渲染 mp4） |
| 规则纪律 | 新动作 / 改阈值必须 RULE-BOUNDARY（矩阵+契约），禁只真机拧参 |

---

## 三、已完成（可当 done）

| ID | 说明 |
|----|------|
| M0～M6-GATE | 模块门禁已过（见 progress） |
| RULE-BOUNDARY | 框架 + 深蹲/俯卧撑矩阵 |
| APP-PUSHUP | `pushup-rules` v0.2.1；真机 OK（深度曾放宽） |
| APP-VOICE | `expo-speech`；默认开；真机确认 OK（需编进 Dev Client） |
| APP-CATALOG | `packages/core/src/exercises/catalog.ts` + 库 Section UI |
| 训练去 Ghost | `DevPoseScreen` 不再叠参考骨（待轨迹参考骨架接回） |
| 详情 demo 播放器 | `ExerciseDemoPlayer` + `demoAssets.ts`（无 mp4 时占位）；**不阻塞主线** |
| EAS 配置 | `apps/mobile/eas.json`；未打云端包 |

真机设备名约 **G4B**；Metro 需 `nvm use 24` + 必要时 `ulimit -n 65536`。

---

## 四、当前主线（下一会话直接做）

**Backlog**：`APP-TRAJECTORY`  
**next_task**：`T7-1`  
**队列**：`T7-1` → `T7-2` → `T7-3`

| 任务 | PRD | 做什么 |
|------|-----|--------|
| **T7-1** | FR-067 | 轨迹 JSON 格式；离线从示范视频提取；深蹲/俯卧撑各 ≥1 条清洗循环轨迹 |
| T7-2 | FR-068 | 训练页按相位/进度叠加示范参考骨架（可开关） |
| T7-3 | FR-069 | 轨迹辅助校验/阈值校准（同步矩阵） |

说明文档：`docs/exercises/trajectory-pipeline.md`  
检验：`VT-P7-001`～`003`（`docs/VERIFICATION.md`）  
模块：`M11-trajectory`（`docs/MODULES.md`）

---

## 五、明确不做 / 延后

| 项 | 状态 |
|----|------|
| FR-064 详情解剖 3D mp4 | deferred（播放器位保留） |
| APP-UPGRADE 臀桥等 | open，排在 T7-2 之后 |
| MP-FPS | parked |
| 公开 TestFlight | 暂缓 |

---

## 六、关键路径速查

| 用途 | 路径 |
|------|------|
| 需求 | `docs/PRD.md` v0.3.2 |
| 进度 | `docs/progress.json` |
| 轨迹主线 | `docs/exercises/trajectory-pipeline.md` |
| 动作目录 | `docs/exercises/catalog.ts` + `docs/exercises/catalog.md` |
| 升级队列 | `docs/exercises/UPGRADE-QUEUE.md` |
| App 训练 | `apps/mobile/src/screens/DevPoseScreen.tsx` |
| 会话配置 | `apps/mobile/src/exerciseSession.ts` |
| 语音 | `apps/mobile/src/voiceCoach.ts` |
| 详情 demo | `apps/mobile/src/components/ExerciseDemoPlayer.tsx` |
| 边界矩阵 | `packages/core/src/boundary/` |

---

## 七、Git 备注

- 分支曾为 `cursor/miniprogram-movenet-wechat-spike`；本地有大提交 `6b844aa`，**当时无 `origin` 远程，push 失败**。新会话若需推送，先配 remote。
- 未提交：`.cursor/` 规则（勿当产品代码提交，除非需要）。

---

## 八、新对话建议开场白（可复制）

```
继续 fitness-coach。已读 docs/session-compression-2026-08-07.md。
PRD 0.3.2，主线 APP-TRAJECTORY：先做 T7-1（示范轨迹格式 + 深蹲/俯卧撑离线提取）。
焦点 App / Dev Client；小程序 MP-FPS parked；FR-064 解剖片 deferred。
```
