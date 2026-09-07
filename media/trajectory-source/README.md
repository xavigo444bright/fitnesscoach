# 示范片源（提轨迹用，非详情页 demo）

把原始示范视频放这里，供离线 PoseDump → 轨迹提取（FR-067）。

| 动作 | 目录 | 建议文件名 |
|------|------|------------|
| 深蹲 | `squat/` | `squat-side-01.mp4`（主轨迹）、`squat-front-01.mp4`（正面备） |
| 俯卧撑 | `pushup/` | `pushup-side-01.mp4`, … |

已收：
- `squat-side-01.mp4`（旧侧面）
- `squat-side-02/03/04.mp4`（ingest cand-01~03，YouTube 深蹲教学；**默认轨迹用 02→v2**）
- `squat-front-01.mp4`（正面）

要求（详见 `docs/exercises/trajectory-pipeline.md` §样片标准）：
- 机位单一（side / front），全身入画
- **8–25 s**，**≥2 次**完整 stand→bottom→stand（站立起止）
- 光线均匀，避免强逆光；mp4 / mov 均可

**不要**放进 `apps/mobile/assets/demos/`——那是详情页 FR-064 示意片（P2）。

大文件 gitignore。放好后在对话里说一声即可。

从可商用 URL **自动下载并筛选候选片**：须先登记 `docs/exercises/asset-scout/clips.json`，再 `ingest --scout-id …`（见 [`tools/trajectory-source-ingest/README.md`](../../tools/trajectory-source-ingest/README.md)）。
