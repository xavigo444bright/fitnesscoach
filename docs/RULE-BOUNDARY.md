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
[ ] docs/exercises/camera-planes/specs.json 已有该 id（FR-089；祖父 10 条除外）
[ ] docs/exercises/<id>-rules.md 定稿（含判定说明；按平面开关规则）
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

## 7. 臀桥参考边沿（与 glute-bridge-rules.md 0.2.1 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| hip-extension（bottom） | 髋伸角 ≥ 130° | 髋伸角 < 130° |
| lumbar-extension | **P2 不做**（侧摄 2D 无可靠腰椎点） | — |

## 8. 弓步参考边沿（与 lunge-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| lunge-depth（bottom） | 工作膝角 &lt; 110° | 工作膝角 ≥ 110° |
| torso-upright（stand） | 前倾 ≤ 55° | 前倾 &gt; 55° |
| 膝内扣 | 侧摄 MVP **不做**（P2 + 正面机位） | — |

对照样片是 `lunge-side-02`（行程完整）。`lunge-side-01` 最深约 133°，不当阈值。禁止把样片最低 65° 抄成报错线（FR-088）。

## 9. 平板支撑参考边沿（与 plank-rules.md 0.1.3 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| body-line（bottom） | 一线 ≥ 160°（髋偏向支撑面 / 衣裤拖地视为撑住） | 一线 &lt; 160°（仅髋离开支撑面的撅臀） |
| 未撑稳 / 跪起 | 离开 `bottom` 暂停计秒 | 不靠一线规则报「没撑住」 |

计数：`hold_second`。撑在 `bottom` 且未触发 `body-line` 时每满 1s +1。对照样片 `plank-side-01`。禁止把样片近 180° 一线抄成报错线（FR-088）。

## 10. 哑铃划船参考边沿（与 db-row-rules.md 0.1.1 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| row-depth（bottom） | 工作肘 &lt; 110° | 工作肘 ≥ 110° |

相位：`standAbove` 125° / `bottomBelow` 95°。半程未进 `bottom` 走 shallow，不计次。对照样片 `db-row-side-01`。禁止抄样片噪声级最小肘角（FR-088）。

## 11. 站姿推举参考边沿（与 ohp-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| torso-upright（stand） | 后仰/前倾 ≤ 55° | 倾角 &gt; 55°（warning） |

相位：`standAbove` 145°（不要用 160°）/ `bottomBelow` 105°。没锁肘主要靠回不了 `stand` 不计次。对照样片 `ohp-side-01`（站姿）。`ohp-side-02` 坐姿不当本 id 阈值。

## 12. 杠铃卧推参考边沿（与 bench-press-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| elbow-depth（bottom） | 肘角 &lt; 120° | 肘角 ≥ 120°（warning） |

相位与俯卧撑同量级：`standAbove` 160° / `bottomBelow` 120°。半程不计次。对照样片 `bench-press-side-01`。禁止抄触胸单帧（FR-088）。

## 13. 罗马尼亚硬拉参考边沿（与 rdl-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| rdl-depth（bottom） | 髋角 &lt; 125° | 髋角 ≥ 125° |

相位：`standAbove` 155° / `bottomBelow` 115°。半程未进 `bottom` 走 shallow。对照样片 `rdl-side-01`。禁止抄样片最低约 50°（FR-088）。

## 14. 引体向上参考边沿（与 pullup-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| pull-depth（bottom） | 工作肘 &lt; 115° | 工作肘 ≥ 115° |

相位：`standAbove` 150° / `bottomBelow` 100°。半程不计次。对照样片 `pullup-side-01`。禁止抄 2D 折叠噪声最小肘角（FR-088）。

## 15. 哑铃飞鸟参考边沿（与 db-fly-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| fly-depth（bottom） | drive &lt; 150°（开合角 &gt; 30°） | drive ≥ 150°（开合角 ≤ 30°，warning） |

相位：`standAbove` 155° / `bottomBelow` 145°。合拢 = stand，打开 = bottom。半程不计次。对照样片 `db-fly-three_quarter-01`（打包名 `db-fly-side-01`）。头侧可计但不打进包。禁止抄样片最大打开角（FR-088）。

## 16. 双杠臂屈伸参考边沿（与 dip-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| dip-depth（bottom） | 肘 &lt; 115° | 肘 ≥ 115°（warning） |
| torso-lean（bottom） | 前倾 ≥ 10°，或肩宽 ≥0.12（偏正） | 前倾 &lt; 10°（warning） |

相位：`standAbove` 150° / `bottomBelow` 110°。锁肘 = stand，沉肩屈肘 = bottom。半程不计次。对照样片 `dip-three_quarter-01`（打包名 `dip-side-01`）。正面绕拍可计但不打进包、不当 2D 轨迹真源。禁止抄样片最低肘角（FR-088）。

## 17. 上斜俯卧撑参考边沿（与 incline-pushup-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| elbow-depth（bottom） | 肘 &lt; 120°，或肩宽 ≥0.12（偏正） | 肘 ≥ 120°（warning） |
| body-line（all） | 一线 ≥ 160°，或肩宽 ≥0.12（偏正） | 一线 &lt; 160°（error） |

相位：`standAbove` 160° / `bottomBelow` 120°（与标准俯卧撑同量级）。撑起 = stand，胸口近支撑面 = bottom。半程不计次。对照样片 `incline-pushup-side-01`。正面可计但不打进包；肘外展为 P2。禁止抄样片最低肘角（FR-088）。

## 18. 绳索夹胸参考边沿（与 cable-crossover-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| crossover-depth（bottom） | drive &lt; 90°（开合角 &gt; 90°） | drive ≥ 90°（开合角 ≤ 90°，warning） |

相位：`standAbove` 120° / `bottomBelow` 80°。交汇 = stand，打开 = bottom。半程不计次。对照样片 `cable-crossover-front-01`。禁止抄飞鸟 155/145，也禁止抄样片最大打开角（FR-088）。

## 19. 坐姿推胸器参考边沿（与 chest-press-machine-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| press-depth（bottom） | 肘均值 &lt; 105° | 肘均值 ≥ 105°（warning） |

相位：`standAbove` 130° / `bottomBelow` 95°。推起 = stand，收到胸口 = bottom。驱动用可见肘**均值**（侧面远臂 2D 常折叠，不用单侧高 vis）。对照样片 `chest-press-machine-side-01`。3/4 可计但不打进包、不当轨迹真源。禁止抄样片最低肘角（FR-088）。

## 20. 哑铃侧平举参考边沿（与 lateral-raise-rules.md 0.1.1 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| raise-height（bottom） | drive &lt; 125°（外展 &gt; 55°） | drive ≥ 125°（warning） |

相位：`standAbove` 155° / `bottomBelow` 115°。下垂 = stand，抬至约肩高 = bottom。`drive = 180 − max(两侧肩到肘或腕相对竖直向下)`，不用髋。肩宽 &lt;0.12（偏侧）时关掉高度规则。侧面冻计数。单次峰谷差 &lt; 50° 按半程不计。对照样片 `lateral-raise-front-01`。禁止抄样片最高外展（FR-088）。

## 21. 哑铃前平举参考边沿（与 front-raise-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| raise-height（bottom） | drive &lt; 125° | drive ≥ 125°（warning） |

相位同侧平举。肩宽 ≥0.12（偏正）时关掉。对照样片 `front-raise-side-01`。禁止抄样片最大矢状面抬角（FR-088）。

## 22. 俯身飞鸟参考边沿（与 rear-delt-fly-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| fly-depth（bottom） | drive &lt; 135°（开合角 &gt; 45°） | drive ≥ 135°（warning） |

相位：`standAbove` 155° / `bottomBelow` 125°。合拢 = stand，打开 = bottom。与飞鸟同一 `dbFlyDriveDeg`。对照样片 `rear-delt-fly-three_quarter-01`（包内文件名 `rear-delt-fly-side-01.mp4`）。禁止抄样片最大打开（FR-088）。

## 23. 面拉参考边沿（与 face-pull-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| pull-height（bottom） | 肘均值 &lt; 115° | 肘均值 ≥ 115°（warning） |

相位：`standAbove` 130° / `bottomBelow` 100°。伸向绳索 = stand，拉至面部 = bottom。对照样片 `face-pull-three_quarter-01`（包内 `face-pull-side-01.mp4`）。禁止抄样片最弯肘角（FR-088）。

## 24. 派克俯卧撑参考边沿（与 pike-pushup-rules.md 0.1.0 一致）

| 规则 | 不触发 | 触发 |
|------|--------|------|
| elbow-depth（bottom） | 肘均值 &lt; 120° | 肘均值 ≥ 120°（warning） |
| pike-line（all） | 肩-髋-踝 ≤ 100° | 肩-髋-踝 &gt; 100°（error，摊成普通俯卧撑） |

相位复用上斜：`standAbove` 160° / `bottomBelow` 120°。撑起 = stand，头近地面 = bottom。肩宽 ≥0.12 时两条都关掉。对照样片 `pike-pushup-side-01`（0:02–0:11）。禁止抄样片最低肘角（FR-088）。

