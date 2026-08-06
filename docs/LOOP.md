---
document: LOOP
product: fitness-coach
version: 0.4.0
last_updated: 2026-07-25
plan: module-based
depends_on:
  - docs/MODULES.md
  - docs/progress.json
  - docs/VERIFICATION.md
---

# Loop 自动开发指南（按模块推进）

不按天数。按 **`docs/MODULES.md` 模块依赖** 推进；每轮迭代完成 **1 个 Task** 或处理 **1 个 GATE**。

## 启动

```
/loop 30m 阅读 docs/LOOP.md，执行一次 fitness-coach 模块迭代
```

动态节奏（你盯着时）：

```
/loop 阅读 docs/LOOP.md，执行一次 fitness-coach 模块迭代
```

停止：`停止 loop` → 立刻杀 sleeper、**禁止再 arm**、`progress.loop.mode = stopped`。

---

## 人工校验 = 停表（强制）

Loop 服务于用户进程：

```
自动跑 next_task → 碰到需人工 → paused_human（杀 sleeper，不计时）
     ↑                                    ↓
     └──── 用户确认 VT/GATE 通过 ←────────┘
```

- **禁止**在等人检验时还 `sleep` / arm heartbeat（「为什么还在计时」= 错误）
- 进入人工节点：`loop.mode = paused_human`，写清 `blocker` 与待确认 VT
- 用户说通过后：`mode = running`，再做下一任务；若用户仍要 loop，才重新 arm

---

## Wake 纪律（强制，高于「做 next_task」）

Heartbeat / shell 完成通知 **不等于**「立刻编码下一任务」。先读 `progress.json`：

| 状态 | Wake 后允许做什么 |
|------|-------------------|
| `loop.mode = stopped` | 只汇报已停止；不执行、不 re-arm |
| `loop.mode = paused_human` 或 `blocked` | 只复述待验项；**不编码、不推进、不 re-arm** |
| `next_task.human_required = true` | 同上（应已是 `paused_human`） |
| 对话/log 标明正等真机 | 同上 |
| `running` 且任务可无人完成 | 才执行 **仅一个** `next_task`，再按规则 re-arm |

硬禁：
- 禁止因 wake /「perform follow-up」在检验窗口期盲目推进或改依赖（如乱装 TFJS）
- 禁止跳过未确认的 GATE / VT
- 禁止同时多个 `AGENT_LOOP_WAKE_fcmod` sleeper

解除须用户明确说通过（见下节）。

---

## 每轮迭代流程

1. 读 `docs/progress.json`（若 `loop.mode=stopped` → 停；若 blocked / 待检验 → 只汇报）
2. 读 `docs/MODULES.md` 中 `current_module` 章节
3. 读 `docs/PRD.md`、`docs/VERIFICATION.md`（仅相关 VT）
4. 执行 `next_task`（**仅一个**）
5. 跑对应该 Task 的 VT（L0/L1/L2 必须跑；L4/L5 且 `human_required` 则 blocked）
6. 更新 `progress.json`：
   - 任务完成 → `completed_tasks` + 弹出 `queue`
   - 遇 `*-GATE` 且自动项全过 → 标 `modules[Mx].status = done`，解锁 `depends_on` 含它的模块为 `ready`
   - 需人工 → `status: blocked`，写 `blocker`，**停手等人**
7. `current_module` 随队列推进；模块做完后切下一模块
8. 写 `iteration_log` 一条

---

## 模块切换规则

| 事件 | 动作 |
|------|------|
| `M0-GATE` 通过 | `M1`、`MU`、`M2B` → `ready` |
| `MU-GATE` 通过 | M3/M4/M5 允许做 UI 实现（此前仅逻辑） |
| `M1-GATE` 通过 | `M2A` → `ready` |
| `M2A-GATE` 通过 | `M3` → `ready` |
| `M3-GATE` 通过 | `M4` → `ready` |
| `M2B-GATE` + `M3-GATE` | `M5` → `ready` |
| `M4-GATE` + `M5-GATE` | `M6` → `ready` |
| `M6-GATE` 通过 | `status: complete` |

**并行提示**：`M1-GATE` 后 Loop 可交替做 `M2A` 与 `M2B`（由你在 `progress.json` 改 `current_module` 指定焦点）。

---

## 解除阻塞

```
已确认 [VT-ID 或 GATE-ID] 通过，解除阻塞，继续模块迭代
```

---

## 护栏

- 不跨模块偷跑（`depends_on` 未 done 则 skip）
- 不跳过 GATE
- 不未经用户同意 commit/push
- 不修改 PRD 需求真源（可建议）

---

## 迭代汇报模板

```
模块：M2A | 任务：M2A-T4 ✅
VT：VT-P2-002 自动化部分通过；真机待确认
下一：M2A-T5
阻塞：无 / 需真机 DevPoseScreen
```

---

## 相关文件

| 文件 | 用途 |
|------|------|
| `docs/MODULES.md` | 模块定义、Task、门禁 |
| `docs/progress.json` | 状态机 |
| `docs/VERIFICATION.md` | VT 细则 |
