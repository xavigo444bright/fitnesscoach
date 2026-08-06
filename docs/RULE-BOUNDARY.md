# 动作规则边界自动化（RULE-BOUNDARY）

> 上线前必做。目标：**扩到第 N 个动作仍靠 CI 检出误报/漏报**，禁止「每个动作靠真机肉眼拧阈值」。  
> 实现：`packages/core/src/boundary/` · 检验：`VT-RB-001`～`VT-RB-004`（见 `docs/VERIFICATION.md`）。

## 1. 问题

深蹲 MVP 靠少量 FX 夹具 + 真机调参过关。第二个动作起若仍如此，成本随动作数线性膨胀，且回归靠记忆。

## 2. 每个新动作必须交付的四层（缺一不可进库）

| 层 | 内容 | 谁写 | CI？ |
|----|------|------|------|
| L0 规则真源 | `docs/exercises/<id>-rules.md`（阈值、相位、文案） | 人 | 契约测试 |
| L1 边界矩阵 | 每条规则：`ok` / `critical_ok` / `critical_fault` / `violation` + 相位交叉 | 人（按模板填） | ✅ `boundary` 测 |
| L2 阈值扫描 | 对连续量（角度）在阈值两侧扫一圈，断言触发边沿 | 可合成 | ✅ sweep 测 |
| L3 反馈 latch | 进入防抖 / 解除防抖 / 相位切换清 latch | 复用通用测 + 动作特例如需 | ✅ |
| L4 真机抽检 | 门禁冒烟，**不**当调参主路径 | 人偶尔 | 否 |

可选：录屏黄金集（L5）——有了再挂，不阻塞本框架。

## 3. 边界矩阵语义

| kind | 含义 | 期望 |
|------|------|------|
| `ok` | 明确正确区 | 目标规则 **不**触发；status 符合矩阵 |
| `critical_ok` | 阈值内侧（刚好还算过） | 目标规则 **不**触发 |
| `critical_fault` | 阈值外侧（刚好该报） | 目标规则 **触发** |
| `violation` | 明确违规区 | 目标规则触发；severity 符合 |
| `phase_off` | 同姿态、规则不适用相位 | 该规则 **不在** 本帧评估结果里（或未触发） |
| `disabled` | 产品禁用（如侧摄 valgus） | 即使几何「像违规」也不触发 |

阈值数字必须能从 rules.md 的「目标 ± 容差」推出来，禁止矩阵与文档各写一套。

## 4. 新增动作检查清单（复制用）

```
[ ] docs/exercises/<id>-rules.md 定稿（含判定说明）
[ ] packages/core exercises/<id>.ts + 契约测试（对标 squat.test.ts）
[ ] packages/core/src/boundary/<id>Matrix.ts 填满每条规则的 ok/critical_*/violation/phase_off
[ ] 连续量规则补 sweep（或声明离散规则免扫）
[ ] pnpm --filter @fitness-coach/core test 全绿
[ ] 真机冒烟（可选抽 1 条 violation + 1 条 ok）→ 不在此改阈值；失败先查矩阵/实现
```

## 5. 深蹲参考边沿（与 squat-rules.md 0.3.3 一致）

科学/产品依据见该文件「依据与取舍」与 `docs/rule-audit-squat.md`（方案 A：阈值维持）。

| 规则 | 不触发 | 触发 |
|------|--------|------|
| squat-depth（bottom） | 膝角 &lt; 110° | 膝角 ≥ 110° |
| torso-upright（stand） | 前倾 ≤ 55° | 前倾 &gt; 55° |
| knee-valgus-* | 侧摄 MVP **恒不触发**（disabled） | （正面机位启用后再补矩阵） |

## 6. 与俯卧撑的关系

`pushup-rules.md` v0.2.0 + `pushupMatrix` + sweep 已落地（VT-RB-004 / VT-P6-001～002）。扩第三动作时同样：**先矩阵与契约，再接线 App**；禁止先真机拧阈值再补测。
