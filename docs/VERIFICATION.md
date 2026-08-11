---
document: VERIFICATION
product: fitness-coach
version: 0.1.0
status: draft
last_updated: 2026-07-07
depends_on:
  - docs/PRD.md
  - docs/ROADMAP.md
---

# 检验与测试手册

> **给 AI Agent**：实现或完成任一 Phase 任务后，**必须**按本文件对应章节执行检验。未通过门禁不得进入下一阶段。引用检验项请使用 ID（如 `VT-P1-003`）。

## 1. 检验体系概览

### 1.1 六级检验模型

| 级别 | 名称 | 运行环境 | 用途 | 谁执行 |
|------|------|----------|------|--------|
| L0 | 冒烟 Smoke | 本地 CLI | 工程能构建、能启动 | 开发 / CI |
| L1 | 单元 Unit | Node / Jest | 纯函数逻辑（角度、规则、相位） | 开发 / CI |
| L2 | 契约 Contract | Node | 模块接口、类型、规则与文档一致 | 开发 / CI |
| L3 | 集成 Integration | 模拟器 / 调试页 | 多模块串联（pose → core → render） | 开发 |
| L4 | 真机 Manual | 物理手机 | FPS、延迟、人体真实动作 | 开发 / 产品 |
| L5 | 场景 Scenario | 真机 | 完整用户旅程 + 里程碑验收 | 产品 / 开发 |

**原则**：能自动化的不上真机；必须上真机的不用单元测试代替。

### 1.2 依赖链与检验顺序

```
L1 core ─────────────────────────────────────────────┐
       ↓                                            │
L2 规则契约（squat-rules.md ≡ squat.ts）            │
       ↓                                            │
L3 pose-native ──→ core ──→ render                  │ 下游变更后
       ↓              ↓         ↓                    │ 必须重跑上游
L4 App 调试页 ──→ 训练页 ──→ 完整会话               │ L1 + 受影响 L3/L4
       ↓                                            │
L5 里程碑 M1–M5                                     ┘

小程序线：pose-mp 替换 pose-native，L1/L2 不变，L3–L5 重跑
```

**依赖铁律**：上层模块未通过检验，下层不得宣称完成。

### 1.3 阶段门禁（Gate）

每个 Phase 结束必须满足：

1. 该 Phase **全部** `VT-Px-*` 项为 ✅
2. **回归**：重跑所有上游 Phase 的 L0 + L1（及列出的 L2）
3. **交付物**已写入约定路径（报告、录屏、测试矩阵）
4. 负责人在 `docs/VERIFICATION.md` 底部进度表打勾

---

## 2. 全局命令（工程就绪后）

```bash
# 仓库根目录
pnpm install

# L0 冒烟
pnpm run build          # 全量构建无报错
pnpm run typecheck      # TypeScript 无类型错误

# L1 + L2 单元与契约
pnpm --filter @fitness-coach/core test
pnpm --filter @fitness-coach/core test:coverage  # 核心模块 ≥80%

# L3 App 集成（调试页）
pnpm --filter mobile start
# 打开 App 内 DevPoseScreen

# 小程序
pnpm --filter miniprogram dev
```

> 代码尚未 scaffold 时，以各 Phase 内「临时命令」为准；Phase 1 完成后统一为上述命令。

---

## 3. 测试夹具（Fixtures）

`packages/core` 需提供可复现的 landmark 假数据，**禁止**靠随机或实时摄像头跑 L1/L2。

| 夹具 ID | 场景 | 用途 |
|---------|------|------|
| `FX-SQUAT-STAND` | 站立，膝角 175° | 相位、无错误 |
| `FX-SQUAT-BOTTOM-OK` | 底部，膝角 85°，躯干直立 | 正确 deep squat |
| `FX-SQUAT-SHALLOW` | 底部，膝角 115° | 触发 `squat-depth` |
| `FX-SQUAT-VALGUS-L` | 左膝内扣 | 触发 `knee-valgus-l` |
| `FX-SQUAT-LEAN` | 躯干相对竖直前倾 &gt;55° | 触发 `torso-upright` |
| `FX-SEQ-5REPS` | 5 次完整相位序列 | rep 计数 |

每个夹具为 JSON：`{ landmarks: Landmark[], meta: { expectedPhase, expectedStatus, expectedIssues } }`

**检验**：`VT-P1-010` — 夹具目录存在且每个文件有对应测试用例。

---

## 4. 分 Phase 检验清单

### Phase 0：双平台技术 Spike

**前置依赖**：无  
**目标**：证明摄像头 → 关键点 → 可接受 FPS 在两平台至少一种方案可行

#### 0A — App Spike

| 检验 ID | 级别 | 检验内容 | 操作步骤 | 通过标准 |
|---------|------|----------|----------|----------|
| VT-P0A-001 | L0 | 工程启动 | `npx expo start`，模拟器打开 | 无红屏、无 crash |
| VT-P0A-002 | L4 | 摄像头权限 | 真机首次打开，点允许/拒绝 | 允许：有画面；拒绝：有引导文案 |
| VT-P0A-003 | L4 | 前后摄切换 | 训练页切换摄像头 | 画面切换，无黑屏 >2s |
| VT-P0A-004 | L3 | 关键点输出 | 开调试日志或 overlay | 全身入镜时稳定输出 ≥17 点 |
| VT-P0A-005 | L4 | 骨骼跟手 | 原地抬手、深蹲 10 次 | 骨架跟随，无明显漂移 >500ms |
| VT-P0A-006 | L4 | FPS | 屏幕角标或日志统计 30s | 中端机 ≥15 FPS |
| VT-P0A-007 | L4 | 首次加载 | 清缓存冷启动计时 | <20s（KPI-006） |

**依赖项确认**（0A 内部）：

```
T0A-1 工程 → VT-P0A-001 通过后才能做 T0A-2
T0A-2 摄像头 → VT-P0A-002/003 通过后才能做 T0A-3
T0A-3 推理 → VT-P0A-004 通过后才能做 T0A-4/5
T0A-4 绘制 → VT-P0A-005 通过后才能采信 VT-P0A-006
```

#### 0B — 小程序 Spike

| 检验 ID | 级别 | 检验内容 | 操作步骤 | 通过标准 |
|---------|------|----------|----------|----------|
| VT-P0B-001 | L0 | 编译 | 微信开发者工具打开 `apps/miniprogram` | 无编译错误 |
| VT-P0B-002 | L4 | 摄像头 | 真机预览 | 有画面，授权流程正常 |
| VT-P0B-003 | L3 | 关键点 | 开调试页 | 全身入镜有点输出 |
| VT-P0B-004 | L4 | FPS | 统计 30s | ≥10 FPS，或记录实际值 |
| VT-P0B-005 | L2 | 方案决策 | 填写 `docs/spike-report.md` | 选定 A/B/C/D，更新 PRD §5.3 |

#### Phase 0 门禁

- [ ] VT-P0A-001 ~ 007 全部 ✅
- [ ] VT-P0B-001 ~ 005 全部 ✅
- [ ] `docs/spike-report.md` 已填写机型、FPS、选定方案

**未通过处理**：

| 失败项 | 动作 |
|--------|------|
| FPS 不达标 | 降分辨率 → 换 lite 模型 → 记录仍不达标则更新 PRD 降级 KPI |
| 小程序无纯端侧方案 | 选云端方案，PRD 补充隐私授权，M4 排期不变但加合规项 |

---

### Phase 1：Monorepo + packages/core

**前置依赖**：Phase 0 门禁通过  
**目标**：业务逻辑可离线验证，与平台无关

| 检验 ID | 级别 | 检验内容 | 操作步骤 | 通过标准 |
|---------|------|----------|----------|----------|
| VT-P1-001 | L0 | Monorepo | `pnpm install && pnpm run build` | 无报错 |
| VT-P1-002 | L1 | `angles.ts` | `pnpm --filter core test angles` | 已知三点夹角断言通过 |
| VT-P1-003 | L1 | `validate.ts` | 对每个 `FX-*` 夹具跑 validate | 状态与 `expectedStatus` 一致 |
| VT-P1-004 | L1 | `phase.ts` | 输入 `FX-SEQ-5REPS` 相位序列 | 相位转移顺序正确 |
| VT-P1-005 | L1 | `repCounter.ts` | `FX-SEQ-5REPS` | count === 5 |
| VT-P1-006 | L2 | 规则契约 | 脚本对比 `squat-rules.md` 与 `squat.ts` | 规则 ID、阈值、文案一致 |
| VT-P1-007 | L1 | 防抖逻辑 | 单帧错误不触发；持续 debounceMs（默认 800ms）触发 | 时间模拟测试通过 |
| VT-P1-008 | L1 | 冷却逻辑 | cooldownMs（默认 3s）内同错误不重复 | 时间模拟测试通过 |
| VT-P1-009 | L1 | 覆盖率 | `test:coverage` | core 核心文件 ≥80% |
| VT-P1-010 | L2 | 夹具完备 | 检查 `fixtures/` 目录 | §3 全部夹具存在 |

#### RULE-BOUNDARY（上线前 / 扩动作前必做）

手册：`docs/RULE-BOUNDARY.md`。实现：`packages/core/src/boundary/`。

| 检验 ID | 级别 | 检验内容 | 操作步骤 | 通过标准 |
|---------|------|----------|----------|----------|
| VT-RB-001 | L1 | 边界矩阵 | `pnpm --filter @fitness-coach/core test boundary` | 每条规则含 ok/critical_ok/critical_fault/violation（+ phase_off/disabled 视规则）全绿 |
| VT-RB-002 | L1 | 阈值扫描 | 同上，sweep describe | 连续量在阈值两侧触发边沿与 rules.md 一致 |
| VT-RB-003 | L1 | 反馈 latch | boundary 内 latch 用例 | 进入防抖 / 解除防抖 / 相位切换清 latch |
| VT-RB-004 | L2 | 扩动作门禁 | 新动作合并前 | 已填 `<id>Matrix`（非空 stub）+ 契约测；禁止仅真机调参 |

**依赖项确认**：

```
angles → validate（validate 依赖 angleBetween）
validate + phase → repCounter（计数依赖相位）
squat-rules.md → squat.ts（L2 契约先于 L1 场景测试）
防抖/冷却 → 在 validate 或 feedback 层单测，Phase 3 前必须完成
扩动作 → VT-RB-001～004（先于 App 接线）
```

**Phase 1 门禁**：VT-P1-001 ~ 010 全部 ✅  
**扩动作门禁**：目标动作 VT-RB-001～004 ✅（深蹲参考矩阵已落地）

---

### Phase 2：App 姿态管线（packages/pose-native）

**前置依赖**：Phase 1 门禁  
**目标**：真机稳定输出平滑 landmarks，可驱动 core

| 检验 ID | 级别 | 检验内容 | 操作步骤 | 通过标准 |
|---------|------|----------|----------|----------|
| VT-P2-001 | L2 | 接口契约 | `pose-native` 导出 `detect(frame): Landmark[]` | 类型与文档一致 |
| VT-P2-002 | L3 | 接 core | 调试页：摄像头 → detect → validate | 实时显示膝角 + status |
| VT-P2-003 | L1 | 平滑 | 对比开关滤波前后关节坐标方差 | 方差下降（单元测或录数） |
| VT-P2-004 | L3 | visibility | 遮挡一腿 | 低置信度关节不参与 validate |
| VT-P2-005 | L4 | FPS 回归 | 接 core 后真机 30s | 仍 ≥15 FPS |
| VT-P2-006 | L4 | 降级 | 低端机或手动降分辨率 | FPS 达标或自动降级生效 |

**依赖项确认**：

```
Phase 1 core 单测全绿 → 才能做 VT-P2-002
VT-P2-002 通过 → 证明 pose-native 输出格式与 core 输入匹配
VT-P2-005 失败 → 先优化 pose 层，不得跳到 Phase 3 UI
```

**Phase 2 门禁**：VT-P2-001 ~ 006 全部 ✅

---

### Phase 3：App 训练体验

**前置依赖**：Phase 2 门禁  
**目标**：PRD P0 功能在真机闭环

#### 3A — 反馈层（M1）

| 检验 ID | 级别 | 检验内容 | 操作步骤 | 通过标准 |
|---------|------|----------|----------|----------|
| VT-P3A-001 | L3 | 骨骼绘制 | 训练页 | FR-060：点+线可见 |
| VT-P3A-002 | L4 | 颜色编码 | 标准蹲 vs 半蹲 vs 内扣 | FR-061：绿/黄/红正确 |
| VT-P3A-003 | L4 | 文字反馈 | 三种错误各做 1 次 | FR-063、FR-045：文案对且 ≤2 条 |
| VT-P3A-004 | L1 | 防抖 | 快速抖一下 | FR-042：不闪报 |
| VT-P3A-005 | L1 | 冷却 | 同一错误连续触发 | FR-043：≥cooldown（默认 3s） |
| VT-P3A-006 | L4 | 站位引导 | 走出画面 | FR-022：有引导 |
| VT-P3A-007 | L4 | 延迟 | 从动作变化到颜色变化 | ≤200ms（KPI-001） |

#### 3B — 动画 + 计数 + 页面流（M2）

| 检验 ID | 级别 | 检验内容 | 操作步骤 | 通过标准 |
|---------|------|----------|----------|----------|
| VT-P3B-001 | L4 | Ghost 显示 | 深蹲全程 | FR-064：半透明参考骨架 |
| VT-P3B-002 | L4 | Ghost 同步 | 对比相位 | FR-065：延迟 <250ms |
| VT-P3B-003 | L4 | Rep 计数 | 标准 5 蹲 | FR-051：5/5 |
| VT-P3B-004 | L4 | 半蹲不计数 | 5 次半蹲（未蹲到平行/未进 bottom） | FR-052：0 rep |
| VT-P3B-005 | L5 | 页面流 | 首页→详情→准备→训练→总结 | §9 PG-001–005 无断点 |
| VT-P3B-006 | L5 | 倒计时 | 准备页 | FR-070：3-2-1 |
| VT-P3B-007 | L5 | 总结页 | 练完一组 | FR-072：rep、用时、错误 |

#### M1 场景脚本（VT-P3A-M1）

| 步骤 | 操作 | 期望 |
|------|------|------|
| 1 | 侧面标准深蹲 3 次 | 绿色为主，correct |
| 2 | 故意半蹲 3 次 | 红色膝/髋，「蹲得不够深」 |
| 3 | 故意膝内扣 3 次 | 「膝盖内扣」 |
| 4 | 快速抖动身体 2s | 不闪报 |

#### M2 场景脚本（VT-P3B-M2）

| 步骤 | 操作 | 期望 |
|------|------|------|
| 1 | 完整旅程练 5 rep | 计数 5，有总结 |
| 2 | 录屏 2min | 含 ghost + 反馈 + 总结 |

**Phase 3 门禁**：3A 全部 ✅ → 可宣布 M1；3B 全部 ✅ → 可宣布 M2

---

### Phase 4：App 打磨与内测（M3）

**前置依赖**：M2 通过

| 检验 ID | 级别 | 检验内容 | 通过标准 |
|---------|------|----------|----------|
| VT-P4-001 | L4 | 弱光提示 | 关灯或背光，FR-023 文案出现 |
| VT-P4-002 | L4 | 严格度 | 宽松 vs 严格模式，误报率有差异 |
| VT-P4-003 | L3 | 历史存储 | 练 2 次后重启 App，FR-073 记录仍在 |
| VT-P4-004 | L4 | 测试矩阵 | `ROADMAP.md` 矩阵填 ≥3 台机 |
| VT-P4-005a | L2 | 内测配置就绪 | `apps/mobile/eas.json` + README 分发步骤齐全（可不打云端包） |
| VT-P4-005b | L5 | 内测包他人可装 | TestFlight 或 APK 他人安装后无需 Metro 可训练（原 VT-P4-005） |
| VT-P4-006 | L2 | 隐私文案 | 写明本地推理、不上传视频 |
| VT-P4-007 | L5 | 语音反馈 | 训练中纠错/不计次可播报；「语音开/关」生效（FR-066） |
| VT-P4-008 | L3 | 详情 demo 位 | 无片时「待导入」占位即可（FR-064 P2，不阻塞主线） |
| VT-P4-009 | L3 | 分部位动作库 | 胸/肩/背/下肢/核心分区；catalog 项不可开始训练 |

### Phase 7：示范轨迹（训练精度）

| 检验 ID | 级别 | 检验内容 | 通过标准 |
|---------|------|----------|----------|
| VT-P7-001 | L2 | 轨迹产物 | 深蹲、俯卧撑各 ≥1 条清洗后轨迹可被 core/App 加载 |
| VT-P7-002 | L5 | 轨迹参考驱动 | 开关开时参考随相位/进度变化；关则仅用户骨（历史 2D 占位已通过逻辑验收） |
| VT-P7-003 | L4/L5 | 对照改善 | 启用轨迹对照或校准后，抽测误报/漏报不差于基线（**可延后**，不阻塞 Plan C） |

### Phase 8：训练 3D 参考（Plan C / FR-068）

| 检验 ID | 级别 | 检验内容 | 通过标准 |
|---------|------|----------|----------|
| VT-P8-001 | L2 | 3D Spike | Dev Client 可渲染可驱动的 3D 人体（或等价）；选型记 OQ-005 |
| VT-P8-002 | L5 | squat side | 训练中 3D 参考随相位运动；可开关；观感用户确认优于 2D |
| VT-P8-003 | L5 | pushup side | 同上；延迟观感 <250ms |
| VT-P8-004 | L4 | 性能 | 叠加 3D 后推理+UI 仍可用（记 FPS/卡顿实值） |

**回归（M3 前必做）**：

```bash
pnpm --filter core test          # L1 全绿
# 真机重跑 VT-P3A-M1 + VT-P3B-M2  # L5 场景
```

---

### Phase 5：微信小程序

**前置依赖**：M3 通过  
**原则**：`packages/core` 零修改或仅平台无关修复；换 `pose-mp`

| 检验 ID | 级别 | 检验内容 | 通过标准 |
|---------|------|----------|----------|
| VT-P5-001 | L0 | 小程序构建 | 开发者工具 + 真机预览无报错 |
| VT-P5-002 | L2 | core 复用 | 同一份 `core` 构建进小程序 | L1 测试仍全绿 |
| VT-P5-003 | L3 | pose-mp | 真机调试页出点 | 同 VT-P2-002 |
| VT-P5-004 | L4 | 双端一致 | 同一夹具（录屏导入）validate 结果一致 | status 相同 |
| VT-P5-005 | L5 | 小程序 M1 脚本 | 重跑 VT-P3A-M1 | 反馈正确 |
| VT-P5-006 | L5 | 小程序 M2 脚本 | 重跑 VT-P3B-M2 | 全流程通过 |
| VT-P5-007 | L4 | 包体 | 主包+分包 | NFR-007 |
| VT-P5-008 | L2 | 隐私（若云端） | 首次授权弹窗 | NFR-003 |

---

### Phase 6：扩展（俯卧撑 + 双端对齐）

| 检验 ID | 级别 | 检验内容 | 通过标准 |
|---------|------|----------|----------|
| VT-P6-001 | L2 | pushup 契约 | `pushup-rules.md` ≡ `pushup.ts`（`pushup.test.ts`） |
| VT-P6-002 | L1 | pushup 夹具 + 矩阵 | FX-PUSHUP-* + `pushupMatrix` + sweep（含 VT-RB-004）全绿 |
| VT-P6-003 | L5 | App 俯卧撑 | **侧面**机位：标准 5 rep 计入；半程不计；塌/撅髋触发身体一线 |
| VT-P6-004 | L5 | 小程序俯卧撑 | 同 VT-P6-003（MP-FPS parked 期间延期） |
| VT-P6-005 | L5 | 动作库切换 | 深蹲 ↔ 俯卧撑无 crash；详情机位/要点随动作切换 |

---

## 5. 模块级依赖检验表

开发某模块时，确认上游状态：

| 我要开发 | 必须先通过 | 检验命令 / 动作 |
|----------|------------|-----------------|
| `packages/core/validate` | `angles` 单测 | `test angles` |
| `packages/core/repCounter` | `phase` + `validate` | `test repCounter` |
| `packages/pose-native` | Phase 0A + core 类型 | Spike FPS + `core test` |
| `packages/render` | core 输出类型 + 假数据 | 用 FX 夹具渲染截图对比 |
| App 训练页 | pose-native + core + render | VT-P2-002 + VT-P3A-001 |
| 小程序任意页 | core L1 全绿 + pose-mp VT-P5-003 | 见上 |

---

## 6. 变更后的回归策略

| 变更位置 | 必跑检验 |
|----------|----------|
| `angles.ts` | L1 全部 core + VT-P2-002 |
| `squat.ts` 规则 | L2 契约 + L1 深蹲夹具 + **VT-RB-001/002** + VT-P3A-M1 真机抽检 |
| 新动作 `*-rules.md` / `exercises/*` | VT-RB-004：矩阵非空 + 契约 + sweep（连续量） |
| `pose-native` | VT-P2-* + VT-P3A-M1 |
| `pose-mp` | VT-P5-* 全套 |
| UI 文案/样式 | 对应用例 VT-P3A/B 手动 |
| `packages/render` | VT-P3A-001/002 真机 |

---

## 7. 交付物与证据

每个 Phase 归档：

| Phase | 路径 | 内容 |
|-------|------|------|
| P0 | `docs/spike-report.md` | FPS、机型、方案 |
| P1 | `packages/core/coverage/` | 覆盖率报告 |
| P3 M1 | `docs/evidence/M1-*.mp4` | 纠错录屏 |
| P3 M2 | `docs/evidence/M2-*.mp4` | 全流程录屏 |
| P4 | `docs/ROADMAP.md` 测试矩阵 | 多机型数据 |
| P5 | `docs/evidence/M4-*.mp4` | 小程序录屏 |

---

## 8. CI 建议（Phase 1 后接入）

```yaml
# .github/workflows/ci.yml 最小集
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm run typecheck
      - run: pnpm --filter @fitness-coach/core test
      - run: pnpm run check:rules-contract  # squat-rules.md vs squat.ts
```

真机 L4/L5 **不进 CI**，靠每周五人工录屏 + 门禁清单。

---

## 9. 进度跟踪

```
Phase 0:  VT-P0A ☐  VT-P0B ☐  门禁 ☐
Phase 1:  VT-P1-001~010 ☐  门禁 ☐
Phase 2:  VT-P2-001~006 ☐  门禁 ☐
Phase 3:  3A-M1 ☐  3B-M2 ☐  门禁 ☐
Phase 4:  VT-P4-001~004/006 ☐  VT-P4-005a ☑  VT-P4-005b ☐  M3 ☐
Phase 5:  VT-P5-001~008 ☐  M4 ☐
Phase 6:  VT-P6-001~003/005 ☑  VT-P6-004 ☐（小程序延期）  M5 ☐
Phase 7:  VT-P7-001~002 ☑  VT-P7-003 ☐（可延后）
Phase 8:  VT-P8-001~004 ☐  （当前主线 Plan C）
```

---

## 10. 相关文档

| 文档 | 路径 |
|------|------|
| PRD | `docs/PRD.md` |
| 路线图 | `docs/ROADMAP.md` |
| 深蹲规则 | `docs/exercises/squat-rules.md` |
| Spike 报告 | `docs/spike-report.md` |

---

*开工前请确认已理解：每一阶段 = 开发 → 按本章检验 → 门禁通过 → 下一阶段。*
