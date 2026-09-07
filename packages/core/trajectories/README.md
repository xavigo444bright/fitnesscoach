# 示范轨迹产物（FR-067）

| 文件 | exerciseId | 说明 |
|------|------------|------|
| `glute-bridge-side-v1.json` | glute-bridge | 磁盘产物；**未**打包进 registry（NFR-010） |
| `lunge-side-v1.json` | lunge | 磁盘产物；**未**打包进 registry（NFR-010）；源片 `lunge-side-02` |
| `squat-side-v1.json` | squat | **默认侧面**（垂臂、行程完整） |
| `squat-side-v2.json` | squat | 备查（ingest；举手帧多，不作默认） |
| `squat-side-v3.json` / `v4.json` | squat | 同片源另两段候选（备查） |
| `squat-front-v1.json` | squat | 正面 |
| `pushup-side-v1.json` | pushup | 真片侧面（yt 27–29s） |
| `pushup-front-v1.json` | pushup | 真片正面（yt 2:44–2:49） |

运行时默认：`getDemoTrajectory('squat'|'pushup','side')` → 对应 `*-side-v1`（assets）。

重提某侧面候选：

```bash
tools/trajectory-extract/.venv/bin/python \
  tools/trajectory-extract/scripts/video_to_pose_dump.py \
  --video media/trajectory-source/squat/squat-side-02.mp4 \
  --exercise squat --camera side \
  --out media/trajectory-source/squat/squat-side-02.pose.json

pnpm --filter @fitness-coach/trajectory-extract extract -- from-dump \
  --input media/trajectory-source/squat/squat-side-02.pose.json \
  --exercise squat --id squat-side-v2 \
  --out packages/core/trajectories
# 再同步 packages/core/src/trajectory/assets/squatSideV2.ts 并改 registry
```
