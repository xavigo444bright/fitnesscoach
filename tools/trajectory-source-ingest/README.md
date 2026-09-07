# trajectory-source-ingest

示范**片源获取**离线工具（FR-067 管线前端）：

**必须** `--scout-id`（清单 `docs/exercises/asset-scout/clips.json`）。新动作须先有机位规格 `docs/exercises/camera-planes/specs.json`（FR-089），否则加载清单失败。授权由仓库所有者确认，本工具不校验许可文本。

清单条目 URL / 本地片 → 下载 → Pose 分析 → 按样片标准评分裁剪 → `media/trajectory-source/<exercise>/_candidates/` + JSON 报告。

**默认不覆盖** `packages/core/trajectories/*.json` 正式轨迹。人工确认候选片后，再交给 `tools/trajectory-extract`。

样片标准见 [`docs/exercises/trajectory-pipeline.md`](../../docs/exercises/trajectory-pipeline.md)。

## 依赖

| 工具 | 用途 |
|------|------|
| Node ≥20 + pnpm | 本 CLI |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | 非直链页面下载（不传 cookies、不绕 DRM） |
| ffmpeg | 裁剪候选 mp4 |
| curl | 直链 `.mp4` / `.mov` / `.webm` |
| Python venv（与 extract **共用**） | MediaPipe PoseDump |

### 共用 Pose 环境（trajectory-extract）

本工具通过 subprocess 调用：

`tools/trajectory-extract/scripts/video_to_pose_dump.py`

请先按 extract 侧准备：

```bash
cd tools/trajectory-extract
python3 -m venv .venv
.venv/bin/pip install mediapipe opencv-python-headless
# 将 pose_landmarker_lite.task 放到 models/
```

大模型与 `.venv` 已被 gitignore。

### 安装本包

在仓库根：

```bash
pnpm install
```

系统包示例（macOS）：

```bash
brew install yt-dlp ffmpeg
```

只下全片（本地再按「行程可读」标定入出点）。一次授权后可逗号分隔整批，不要拆成 N 次命令：

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --download-only --scout-id glute-bridge-side-01,lunge-side-01
```

YouTube 检索不要 WebFetch watch 页：

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --yt-search "how to do a dip" --max 8
```

look-window 已核后只裁参考片（不下片、不 PoseDump）：

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --crop-only --scout-id glute-bridge-side-01
```

产出：`_candidates/<scout-id>.mp4` 与 `media/trajectory-source/<exercise>/<scout-id>.mp4`。不要把后续动作整库打进 App 包（NFR-010）。

已裁参考片上提 PoseDump（`cameraStability=moving` 会跳过）：

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --pose-only --scout-id db-fly-three_quarter-01,db-fly-front-01
```

## 一条命令：scout-id → 候选片

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --scout-id squat-side-01
```

`--url` / `--exercise` / `--camera` 可省略（用清单）；若给出必须与该条一致。`--license` 仍可写入 provenance，**不是**下载开关。

输出：

- `media/trajectory-source/<exercise>/_inbox/` — 原始下载 + 全片 `.pose.json`
- `media/trajectory-source/<exercise>/_candidates/` — 入选片段 + 评分报告（含 `scoutId`）

无外网时验证评分逻辑：

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --dry-run --scout-id squat-side-01
```

## 人工确认后接 trajectory-extract

1. 打开候选 mp4，确认：≥2 次完整 stand→bottom→stand、单一机位、全身入画、**起止垂臂（非过头举手）**、许可可商用。时长为软偏好（约 3–40s），短片多 rep 可入选。评分项含 `armsDownStand`。
2. 将选用片复制并命名到动作目录（不要用 `_candidates` 当正式片源名）：

   ```bash
   cp media/trajectory-source/squat/_candidates/squat-side-cand-01.mp4 \
      media/trajectory-source/squat/squat-side-02.mp4
   ```

3. PoseDump（可复用 inbox 全片 dump 再裁，或对候选片重跑）：

   ```bash
   tools/trajectory-extract/.venv/bin/python \
     tools/trajectory-extract/scripts/video_to_pose_dump.py \
     --video media/trajectory-source/squat/squat-side-02.mp4 \
     --exercise squat --camera side \
     --out media/trajectory-source/squat/squat-side-02.pose.json
   ```

4. 提取轨迹（建议先写到临时目录，验收后再替换正式 JSON）：

   ```bash
   pnpm --filter @fitness-coach/trajectory-extract extract -- from-dump \
     --input media/trajectory-source/squat/squat-side-02.pose.json \
     --exercise squat \
     --id squat-side-v2 \
     --out /tmp/traj-out
   ```

## 法律 / 工程约束

- **不**绕过 DRM、登录墙、付费墙；失败时工具会报错退出。
- 报告内写入 provenance：`scoutId`、`sourceUrl`、`fetchedAt`、`toolVersion`、yt-dlp/ffmpeg 版本、license/note。
- `_inbox` 大视频与 `*.pose.json` gitignore。
- 选片规则见 [`docs/exercises/asset-scout.md`](../../docs/exercises/asset-scout.md)。

## 测试

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest test
```

含合成 PoseDump 评分单测与 CLI `--dry-run`（不访问外网）。
