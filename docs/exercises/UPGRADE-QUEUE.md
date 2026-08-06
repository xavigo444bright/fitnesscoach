# Coachable 升级队列（Phase D）

每次只升级 **1** 个动作，流水线：

1. 定稿 `docs/exercises/<id>-rules.md`
2. `boundary/<id>Matrix` + sweep + 契约测（VT-RB-004）
3. `exercises/<id>.ts` + 夹具
4. keyframes + App `exerciseSession` 接线
5. catalog 将该条 `tier` → `coachable`
6. 真机 VT

## 顺序

| 顺序 | id | 名称 | 部位 | 状态 |
|------|-----|------|------|------|
| 1 | glute-bridge | 臀桥 | 下肢 | queued（下一动作） |
| 2 | lunge | 弓步蹲 | 下肢 | queued |
| 3 | plank | 平板支撑 | 核心 | queued |
| 4 | db-row | 哑铃划船 | 背 | queued |
| 5 | ohp | 站姿推举 | 肩 | queued |
| 6 | bench-press | 杠铃卧推 | 胸 | queued |

## 下一动作

**臀桥（glute-bridge）** — 侧面机位、顶髋相位；规则文档待起草后进入实现。
