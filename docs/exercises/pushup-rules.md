---
exercise: pushup
name: 俯卧撑
camera_hint: front
prd_ref: FR-011
version: 0.1.0
status: planned
---

# 俯卧撑 — 校验规则（P1 批次）

> 状态：planned。App MVP（深蹲）完成后再实现。

## 推荐机位

- **正面**，全身侧面轮廓可见
- 手机竖屏放地面或低支架

## 校验规则（草案）

| 规则 ID | 关节 | 条件 | 容差 | 严重度 | 提示文案 |
|---------|------|------|------|--------|----------|
| elbow-depth | 肩-肘-腕 | 肘角 < 90° at bottom | 10° | warning | 手臂未弯到位 |
| body-line | 肩-髋-踝 | 角 170°–180° | 10° | error | 臀部翘起或下沉，保持身体一条直线 |

## Rep 计数

- bottom：肘角 < 100°
- top：肘角 > 160°
- 完整循环计 1 rep
