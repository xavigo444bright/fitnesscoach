---
exercise: glute-bridge
name: 臀桥
camera_hint: side
prd_ref: FR-011
version: 0.1.0
status: planned
---

# 臀桥 — 校验规则与相位（草案）

> 状态：**planned**。进入实现前须定稿阈值并填 `gluteBridgeMatrix`（VT-RB-004）。  
> 升级队列：`docs/exercises/UPGRADE-QUEUE.md` 第 1 项。

## 推荐机位

- **侧面**：看清肩-髋-膝一线与髋伸展幅度

## 拟校验规则（待定稿）

| 规则 ID | 说明 | 阶段 |
|---------|------|------|
| hip-extension | 顶峰髋未抬够（肩-髋-膝未近一线） | top / bottom |
| lumbar-extension | 过度塌腰代偿 | top |

## 相位（草案）

| 相位 | 含义 |
|------|------|
| stand | 仰卧起始（髋低） |
| ascend | 顶髋上升 |
| bottom | 顶峰（命名沿用引擎 bottom=端点） |
| descend | 下放 |

## Rep

完整顶髋循环计 1；未达髋伸阈值不计。

---

*阈值与依据表在正式实现前补齐「依据与取舍」。*
