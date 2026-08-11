# trajectory-source-ingest

示范**片源获取**离线工具（FR-067 管线前端）：

`可商用视频 URL / 本地片` → 下载 → Pose 分析 → 按样片标准评分裁剪 → `media/trajectory-source/<exercise>/_candidates/` + JSON 报告。

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

## 一条命令：URL → 候选片

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --url 'https://example.com/path/demo.mp4' \
  --exercise squat \
  --camera side \
  --license 'CC-BY-4.0; author; commercial-ok note'
```

输出：

- `media/trajectory-source/squat/_inbox/` — 原始下载 + 全片 `.pose.json`
- `media/trajectory-source/squat/_candidates/squat-side-cand-01.mp4` — 入选片段
- `media/trajectory-source/squat/_candidates/squat-ingest-report-*.json` — 评分与 provenance

本地文件也可：

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --url ./clips/my-squat.mp4 --exercise squat --camera side \
  --license 'owned / licensed for demo trajectory'
```

无外网时验证评分逻辑：

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --dry-run --exercise squat --camera side
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
- 报告内写入 provenance：`sourceUrl`、`fetchedAt`、`toolVersion`、yt-dlp/ffmpeg 版本、license/note。
- `_inbox` 大视频与 `*.pose.json` gitignore；勿把未授权片源提交进库。

## 测试

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest test
```

含合成 PoseDump 评分单测与 CLI `--dry-run`（不访问外网）。
