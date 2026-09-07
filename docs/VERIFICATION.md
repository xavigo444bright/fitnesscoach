---
document: VERIFICATION
product: fitness-coach
version: 0.1.0
status: draft
last_updated: 2026-09-07
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

**真机返工**：L4/L5 报错改代码后，必须先用脚本/单测证明会画出来（顶点非空、bbox 在相机内、apply 后可见）。自检不过不得请用户开手机。

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
L5 里程碑 M1–M4（App）                                     ┘
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
| VT-P1-011 | L1 | 轨迹活动门 | `pnpm --filter @fitness-coach/core test subjectSelect` | 重合度相对本场基线硬下降则 `engineOn=false`；未完成周期 `abortOpenRepCycle` 不计次；站立动作顶仍开。不按动作 id 分支 |

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
| VT-P2-006 | L4 | 降级 | 低端机或手动降分辨率 | **历史门禁**（已通过）。2026-08-13 起 App 固定 high，无质量 UI；控制器仍在 pose-native |
| VT-P2-007 | L1 | 多人 Pose 解析 | `posesFromMediapipeEvent` | `poses[]` 拆出多人；无该字段时仍一人。`subjectSelect`：卧推躺姿赢过站立路人 |

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
| VT-P3A-006 | L4 | 站位引导 | 走出画面；贴边仍入画 | FR-022：未入镜有引导；脚贴画幅底边仍可计数（非整只出画） |
| VT-P3A-007 | L4 | 延迟 | 从动作变化到颜色变化 | ≤200ms（KPI-001） |
| VT-P3A-008 | L4 | 主体+侧骨 | 健身房卧推：背景有站立者；再拍真侧面 | 绿骨在自己身上不在路人身上（FR-090）。侧面两臂都有线、无手指碎点；3/4 不缺半边（FR-060）。近景腿出画不飞点、不叠成网；髋出画不误判正面去提示「放到身体侧面」（**通过 2026-09-07**） |
| VT-P3A-009 | L4 | 停动作不计次 | 任意动作做到一半停下并改变体态（如卧推坐起站直、俯卧撑站起） | 左上不在纠错句之间跳；不因起身加次、不弹绿勾。底栏机位提示可在，计次冻结（FR-090）（**通过 2026-09-07**） |

#### 3B — 动画 + 计数 + 页面流（M2）

| 检验 ID | 级别 | 检验内容 | 操作步骤 | 通过标准 |
|---------|------|----------|----------|----------|
| VT-P3B-001 | L4 | Ghost 显示 | 深蹲全程 | FR-064：半透明参考骨架 |
| VT-P3B-002 | L4 | Ghost 同步 | 对比相位 | FR-065：延迟 <250ms |
| VT-P3B-003 | L4 | Rep 计数 | 标准 5 蹲 | FR-051：5/5 |
| VT-P3B-004 | L4 | 半蹲不计数 | 5 次半蹲（未蹲到平行/未进 bottom） | FR-052：0 rep |
| VT-P3B-005 | L5 | 页面流 | 首页→详情→准备→训练→总结 | §9 PG-001–005 无断点 |
| VT-P3B-006 | L5 | 准备进训练 | 准备页点开始 | 无 3-2-1，直接进入训练页 |
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

### Phase 8：训练 3D 参考（Plan C / FR-068 / FR-080～083）

> 评估动作仅 **squat + pushup**。栈：expo-gl + three.js（`docs/3d-stack-oq-005.md`）。

| 检验 ID | 级别 | 检验内容 | 通过标准 |
|---------|------|----------|----------|
| VT-P8-001 | L1/L4 | 3D Spike | `buildRig3d` 单测绿；Dev Client（须含 expo-gl）可渲染由轨迹 Pose 驱动的 3D 人体；OQ-005 已落盘 |
| VT-P8-002 | L5 | squat side | **通过（2026-08-13）**：训练中 3D 参考随相位运动；可开关；观感优于 2D |
| VT-P8-003 | L5 | pushup side | **通过（2026-08-15）**：3D 参考随相位运动；可开关；延迟观感 <250ms |
| VT-P8-004 | L4 | 性能 | **通过（2026-08-15）**：开 3D 后推理+UI 可用；G4B 开/关参考 FPS 均 ≈30（≥15） |

### Phase 9：轨迹驱动人形 + 肌群（FR-084/085）

> 先细化参考层，不扩第三动作。计划 `docs/3d-human-figure-plan.md`。

| 检验 ID | 级别 | 检验内容 | 通过标准 |
|---------|------|----------|----------|
| VT-P9-001 | L5 | 人形轮廓 | **通过（2026-08-15，签字放行）**：几何含头/胸/骨盆/手足且随相位可开关；真机分块可读性未达预期，观感改 T9-2 |
| VT-P9-002 | L5 | 肌群可读 | **通过（2026-08-21）**：示范窗切「骨骼」浅灰人体底，主动肌小色块可辨（深蹲橙臀+青绿大腿，俯卧撑粉胸；侧面不左右叠腿）；绿骨仍清晰；身上仍是用户 2D 骨；FPS ≥15 |
| VT-P9-003 | L5 | 固定位参考人 | **通过（2026-08-19）**：示范窗默认循环播参考库原片（随站位换片，换片后仍循环）；点画面可暂停/播放，可调倍速；可切「骨骼」看到参考人居中+2D 骨骼且跟人当前姿态；点收起折出屏外、点小 icon 拉开；窗可拖且不吸附贴边；身上 2D 骨骼始终贴合用户自己，含踝/脚 |

### Phase 10：ASSET-SCOUT（FR-087）

| 检验 ID | 级别 | 检验内容 | 通过标准 |
|---------|------|----------|----------|
| VT-P10-001 | L1 | scout 绑定 | `clips.json` 可解析、祖父 10 + Phase E 5 + Phase F 5 个动作、id 唯一；ingest 无 `--scout-id` 失败；`--dry-run --scout-id squat-side-01` 写出报告且含 `provenance.scoutId`；proposed 入出点：`reps` 4–15s（查找带默认 ≤10s）、`hold` 3–8s（超长窗加载失败）；逗号分隔 `--scout-id` 可整批 download/crop |
| VT-P10-002 | L1 | 机位规格门闩（FR-089） | **通过（2026-08-28）**：`specs.json` 可解析；祖父 10 条无 `exercises` 条目；`pnpm --filter @fitness-coach/trajectory-source-ingest test` 含 camera-planes 全绿 |

**回归（M3 前必做）**：

```bash
pnpm --filter core test          # L1 全绿
# 真机重跑 VT-P3A-M1 + VT-P3B-M2  # L5 场景
```

---

### Phase 5：微信小程序 **已取消（2026-09-07）**

VT-P5-001～008 不再执行。

---

### Phase 6：扩展（App 动作库）

| 检验 ID | 级别 | 检验内容 | 通过标准 |
|---------|------|----------|----------|
| VT-P6-001 | L2 | pushup 契约 | `pushup-rules.md` ≡ `pushup.ts`（`pushup.test.ts`） |
| VT-P6-002 | L1 | pushup 夹具 + 矩阵 | FX-PUSHUP-* + `pushupMatrix` + sweep（含 VT-RB-004）全绿 |
| VT-P6-003 | L5 | App 俯卧撑 | **侧面**机位：标准 5 rep 计入；半程不计；塌/撅髋触发身体一线 |
| VT-P6-004 | L5 | ~~小程序俯卧撑~~ | **已取消（2026-09-07）** |
| VT-P6-005 | L5 | 动作库切换 | 深蹲 ↔ 俯卧撑无 crash；详情机位/要点随动作切换 |
| VT-P6-006 | L5 | App 臀桥 | **侧面**仰卧：完整顶髋计入；半程不计；示范窗默认臀桥侧面原片；不 crash（**通过 2026-08-23**） |
| VT-P6-007 | L5 | App 弓步蹲 | **侧面**分腿：完整下到约直角计入；半程不计；示范窗默认 `lunge-side-02` 原片；不 crash（**通过 2026-08-24**） |
| VT-P6-008 | L5 | App 平板支撑 | **侧面**撑稳应每秒 +1；衣裤拖地仍计秒；中央绿圆（打勾同位置）仅在计时进行中显示，底栏为有效秒汇总；撅臀中央隐藏、底栏保留；示范窗默认 `plank-side-01`；不 crash（**通过 2026-08-28**） |
| VT-P6-009 | L5 | App 哑铃划船 | **侧面**完整拉收到髋后计次；半程不计；脚出画/裤摆乱腿点仍应能计次（只看肘）；示范窗默认 `db-row-side-01`；不 crash；正反馈不出现深蹲文案（**通过 2026-08-28**） |
| VT-P6-010 | L5 | App 站姿推举 | **侧面**锁肘计次；半程不计；示范窗默认 `ohp-side-01`（站姿）；不 crash（**通过 2026-08-28**） |
| VT-P6-011 | L5 | App 杠铃卧推 | **侧面**触胸再推起计次；半程不计；示范窗默认 `bench-press-side-01`；不 crash（**通过 2026-08-28**） |
| VT-P6-012 | L5 | App 罗马尼亚硬拉 | **侧面**完整髋铰链到底再锁髋计次；半程不计；示范窗默认 `rdl-side-01`；不 crash（**通过 2026-09-07**） |
| VT-P6-013 | L5 | App 引体向上 | **侧面**拉至过杆再悬垂计次；半程不计；脚出画仍应能计次（只看肘）；示范窗默认 `pullup-side-01`；不 crash；正反馈不出现深蹲文案（**通过 2026-09-07**） |
| VT-P6-014 | L5 | App 哑铃飞鸟 | **凳侧 3/4**：合拢→打开够深→再合拢计次；半程不计；示范窗默认 `db-fly-side-01`（3/4 压缩片）；不 crash；正反馈不出现深蹲文案。头侧/偏正仍应能计（`countPlanes` 含 front），本版不验对称（**通过 2026-08-29**） |
| VT-P6-015 | L5 | App 双杠臂屈伸 | **斜前方 3/4**：锁肘→沉到够深→再锁肘计次；半程不计；示范窗默认 `dip-side-01`（3/4 压缩片）；不 crash；正反馈不出现深蹲文案。正面仍应能计（`countPlanes` 含 front），本版不验对称；`torso-lean` 在正面应关掉（**通过 2026-09-07**） |
| VT-P6-016 | L5 | App 上斜俯卧撑 | **侧面**：撑起→胸口近支撑面→再撑起计次；半程不计；示范窗默认 `incline-pushup-side-01`；不 crash；正反馈不出现深蹲文案。正面仍应能计（`countPlanes` 含 front），本版不验肘外展；`elbow-depth` / `body-line` 在正面应关掉（**通过 2026-09-07**） |
| VT-P6-017 | L5 | App 绳索夹胸 | **正面**：胸前交汇→打开够开→再交汇计次；半程不计；示范窗默认 `cable-crossover-front-01`；不 crash；正反馈不出现深蹲文案（**通过 2026-09-07**） |
| VT-P6-018 | L5 | App 坐姿推胸器 | **侧面**：推起→收到胸口→再推起计次；半程不计；示范窗默认 `chest-press-machine-side-01`；不 crash；正反馈不出现深蹲文案。3/4 仍应能计，本版不当轨迹真源、不打进包（**通过 2026-09-07**） |
| VT-P6-019 | L5 | App 哑铃侧平举 | **正面**：下垂→抬至约肩高→再放下计次；半程/摆动不计；前景挡髋仍应能计；近景腕出左右边仍应计次（刚贴边时偏低记忆不能把次数抬没）；横置/横屏画面抬正后仍应计；侧面转身不计次并提示面对镜头；示范窗默认 `lateral-raise-front-01`；不 crash；正反馈不出现深蹲文案。3/4 可有可无不打进包（**通过 2026-09-07**） |
| VT-P6-020 | L5 | App 哑铃前平举 | **侧面**：下垂→前抬至约肩高→再放下计次；半程不计；远侧与近侧只要画面里看得见夹角都应计（髋在时也不只信髋-肩-肘）；工作臂绿骨（肘弱时肩-腕，不要只剩躯干竖线）；示范窗默认 `front-raise-side-01`；不 crash；正反馈不出现深蹲文案。正面不报高度、不打进包（**通过 2026-09-07**） |
| VT-P6-021 | L5 | App 俯身飞鸟 | **斜侧 3/4**：合拢→打开够开→再合拢计次；半程不计；示范窗默认 `rear-delt-fly-side-01`（3/4 压缩片）；不 crash；正反馈不出现深蹲文案。清侧不打进包（**通过 2026-09-07**） |
| VT-P6-022 | L5 | App 面拉 | **斜前方 3/4**：伸向绳索→拉向面部→再伸回计次；半程不计；示范窗默认 `face-pull-side-01`（3/4 压缩片）；不 crash；正反馈不出现深蹲文案。清侧不打进包（**通过 2026-09-07**） |
| VT-P6-023 | L5 | App 派克俯卧撑 | **侧面**：倒 V 撑起→头靠近地面→再撑起计次；半程不计；髋摊平应报倒 V；示范窗默认 `pike-pushup-side-01`（0:02–0:11）；不 crash；正反馈不出现深蹲文案。正面不报深度/一线、不打进包（**通过 2026-09-07**） |

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

---

## 6. 变更后的回归策略

| 变更位置 | 必跑检验 |
|----------|----------|
| `angles.ts` | L1 全部 core + VT-P2-002 |
| `squat.ts` 规则 | L2 契约 + L1 深蹲夹具 + **VT-RB-001/002** + VT-P3A-M1 真机抽检 |
| 新动作 `*-rules.md` / `exercises/*` | VT-RB-004：矩阵非空 + 契约 + sweep（连续量） |
| `pose-native` | VT-P2-* + VT-P3A-M1 |
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
Phase 5:  VT-P5-* ✕（小程序已取消 2026-09-07）
Phase 6:  VT-P6-001~003/005~023 ☑  VT-P6-004 ✕（小程序已取消）
Phase 7:  VT-P7-001~002 ☑  VT-P7-003 ☐（可延后）
Phase 8:  VT-P8-001~004 ☑  M12-GATE ☑
Phase 9:  VT-P9-001 ☑  VT-P9-002 ☑  VT-P9-003 ☑  M13-GATE ☑
Phase 10: VT-P10-001 ☐（ASSET-SCOUT）  VT-P10-002 ☑
```

---

## 10. 相关文档

| 文档 | 路径 |
|------|------|
| PRD | `docs/PRD.md` |
| 路线图 | `docs/ROADMAP.md` |
| 深蹲规则 | `docs/exercises/squat-rules.md` |
| Spike 报告 | `docs/spike-report.md` |
| 机位规格 | `docs/exercises/camera-planes.md` |

---

*开工前请确认已理解：每一阶段 = 开发 → 按本章检验 → 门禁通过 → 下一阶段。*
