# Grokbot：批量 YouTube scout

> 真源：[`expansion-queue.json`](./expansion-queue.json) + [`../camera-planes/specs.json`](../camera-planes/specs.json)  
> 选片规则：[`asset-scout.md`](../asset-scout.md)（FR-087 / FR-089）

用户已要求扩库。本波只做 **检索 → proposed 清单**。未授权不得 download / crop / 写规则 / 改 catalog `tier`。

## 必须

1. 读 `expansion-queue.json`。Phase **G 优先**（已在 catalog 的 12 条），再 Phase H。
2. YouTube 只走一次 Shell 里的 ingest（整批，网络权限一次 `all`）：

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --yt-search "QUERY" --max 8
```

3. 每条动作用队列里的 `ytQueries`（先搜 `requiredClipCameras` 对应的那条）。
4. 命中后往 [`clips.json`](./clips.json) 加 **`proposed`** 行：`url` + `startSec`/`endSec` + `timeSource`（查找带用 `transcript` / `short-clip`，**不得**标 `user-verified`）。
5. `reps` 查找带 **4–10s、≥2 次完整 ROM 即停**。`hold` **3–8s**，姿势就位后再计。
6. 做完一批把候选标题/频道/秒数列给用户，等人说授权后再：

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --download-only --scout-id id1,id2,...
# 同一批再
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --crop-only --scout-id id1,id2,...
```

## 禁止

- WebFetch `youtube.com` / `youtu.be` watch 页
- 未写机位规格就加 `clips.json`（G/H 规格已写入 `specs.json`）
- 把 `skip` 里的变式拆成新 catalog id
- 为凑 15s 把第三循环或讲解圈进 look-window
- 改训练 overlay / 把动作标成 coachable / arm loop
- 拆成 N 次要权限的 download

## 选片偏好

锁机位、全身入画、连续 ≥2 ROM、无持续绕拍/变焦。教学频道的 how-to 优于 vlog。窗内持续运镜 → 不当 2D 轨迹真源（`cameraStability: moving`）。
