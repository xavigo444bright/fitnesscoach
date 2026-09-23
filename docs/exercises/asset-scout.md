# ASSET-SCOUT：选片清单与 ingest 绑定（FR-087 / FR-089）

> 后半段（下载 / PoseDump / 打分裁剪）见 [`trajectory-pipeline.md`](./trajectory-pipeline.md) 与 `tools/trajectory-source-ingest`。  
> 本文件是**前半段**：模型出清单，**你**确认授权，ingest **必须**带 scout id。  
> **新动作**：先写 [`camera-planes.md`](./camera-planes.md) / [`camera-planes/specs.json`](./camera-planes/specs.json)，再往 `clips.json` 加行。

## 产品决定（2026-08-21，2026-08-22 补 FR-088，2026-08-28 补 FR-089，2026-08-29 补短窗与整批下载）

| 项 | 决定 |
|----|------|
| ingest 门闩 | 必须 `--scout-id` 指向本清单条目；`--exercise` / `--camera` / `--url` 若给出须与条目一致 |
| 授权 | **不由工具校验许可文本**。你确认 = 已通过你的方式接触发行方、具备合法授权（自用与未来发行均如此） |
| 一次授权 = 整批开工 | 你核过链接+时间并回复授权后，模型用**一条** ingest 命令（逗号分隔 `--scout-id`）把该批全部 download+crop。不要再逐条问、不要 WebFetch YouTube watch 页让你点允许 |
| 已入库 squat / pushup | **已授权**（`status: ingested`） |
| 新动作 | **先机位规格（FR-089）**，再落清单，再由你确认是否授权；未确认不 ingest、不写规则 |
| 样片真源 | 核过的 look-window = 示范窗原片 + 2D 骨轨迹真源。窗内机位持续绕拍则**不能**当轨迹真源（示范窗原片仍可能可用） |
| 规则真源 | `*-rules.md` + RULE-BOUNDARY。样片只锁变式 / 规格里的推荐平面 / 驱动角；**禁止**抄示范者单帧角度当阈值 |
| 变式 | 默认同一 catalog id（宽距/窄距下拉不拆）。驱动或对错集打架才新开 id（`plank` ≠ `side-plank`） |
| 机位 | 评估桶三选一：正面/冠状面、侧面、双机位或 3/4。`defaultHint` 是详情页推荐，不是唯一朝向。缺示范片 ≠ 禁止该平面计次。错平面关掉会假阳性的规则 |

禁止：未绑 scout 的裸 URL 下载；模型边逛边 `yt-dlp`。YouTube 检索/探活/下载一律走 ingest CLI / 本机 `yt-dlp`，在**一次** Shell 里完成整批。不绕过 DRM / 登录墙。不要用 WebFetch 打开 `youtube.com` / `youtu.be`。

## 清单

机器真源：[`asset-scout/clips.json`](./asset-scout/clips.json)

| 字段 | 含义 |
|------|------|
| `id` | ingest `--scout-id` |
| `exerciseId` / `camera` | catalog id + 机位（`side` / `front` / `three_quarter`） |
| `url` | YouTube 或 `local:media/...`（已入库本机片） |
| `startSec` / `endSec` | Pose 可用入出点。`proposed`/`authorized` **必须**都有数字，且受下方窗长限制。`null` 仅允许 `ingested` 本地成品片 |
| `windowKind` | `reps` 动态次数 / `hold` 静力支撑（平板） |
| `timeSource` | `user-verified` 你核过时间；`seeked` 已按「行程可读」seek；`transcript` **仅查找带**，入点仍须对齐完整行程（未对齐前不要当核过）；`short-clip` 短示范去掉片头后仍须对齐行程；`unverified` 占位，**必须你改** |
| `timeNote` | 标定说明；授权前请目视 |
| `status` | `proposed` 待你确认 / `authorized` 你已确认 / `rejected` / `ingested` 已提轨迹 |
| `role` | `primary` 首选 / `backup` 备选 |

`status` 只给人看。ingest **不**读取它当下载开关。

## 选窗（硬规则，加载 clips.json 即校验）

管线 `PREFERRED_CLIP_SEC_MAX = 40` 是 **ingest 评分软偏好**，**不是** scout 可以圈整段教程的理由。

选片分两层，不要混：

| 层 | 问题 | 否决条件 |
|----|------|----------|
| **片源** | 这条 URL 能不能当候选 | 没有可用的全身行程段、全是错误示范/变式、机位不可用。片中**穿插**膝/肘特写 **不**否决整条（教学片常态）。窗内**持续绕拍/推轨/明显变焦**不能当 2D 轨迹真源（见下「运镜」） |
| **look-window** | 哪几秒交给 Pose | 只含「行程在画幅里可读」的连续段。特写、口播、摆位、进入姿势、**多出来的第三循环**都切掉 |

### 入点（`startSec`）

入点 = **第一条完整行程已经在机位里可读的那一帧**，不是「字幕说到做次数 / 身体开始动」的那一帧。

`reps` 可读：该动作驱动关节都在画里，并能看见一次完整 ROM（弓步：下蹲到底再起来；不要只有膝特写或半截下行）。  
`hold` 可读：支撑姿势已经就位且全身一线在画里（不要趴地爬进、不要只给腰部特写）。

字幕/`t=` 只用来**缩小查找范围**。估到「开始做了」之后，必须再往后（或往前）对齐到可读行程，允许丢掉窗头 1–3s 的特写/切镜。

禁止当入点：口播、摆机位、教练站旁边指、错误示范、变式、片头片尾、**部位特写/半身切镜**（即使模特已经在动）、行程被切掉一半的镜头。

### 出点（`endSec`）

**第 2 次完整 ROM 结束**（或 hold 仍标准）即停。不要为了凑时长把第三循环、换腿口播、下一变式、切走特写留在窗里。

查找带常见事故：短示范片把 **整段 15s** 圈进去（含讲解）；长教程把 **口播+多遍 reps** 圈成 13s。入点对齐第一条完整行程后，数满两次 ROM 就出点。

### 窗长

| `windowKind` | 硬限（加载即校验） | 选片默认 |
|--------------|-------------------|----------|
| `reps` | **4–15 s**，窗内 ≥2 次完整 ROM | **4–10 s**。`proposed` 且 `timeSource` 为 unverified / short-clip / transcript 时超过 10s **加载失败**。慢动作两次才允许到 15s，且必须 `user-verified` |
| `hold` | **3–8 s** | 姿势就位后的支撑，不要从趴地爬进 |

### 运镜（参考骨）

2D Pose 在**图像坐标**。机位锁死或轻微手持抖动：全身点一起微晃，髋对齐后轨迹仍可用。窗内**持续绕拍、推轨、明显变焦**：背景和透视在变，骨会漂，**不能当 2D 轨迹真源**。肘角等相对量未必立刻废，但示范骨骼会跟镜头走。

- 可接受 → 正常 crop，当示范窗 + 轨迹真源
- 不可接受 → 示范窗原片仍可用；轨迹换一条固定机位片。`cameraStability: moving`

裁后可用 `ingest --check-camera-motion --scout-id <id>` 看角点 SAD。

### 对照：`lunge-side-01`（Bowflex）

旧 scout 窗 **38–48s** 来自字幕「give us a couple repetitions」——把「开始讲次数」当成了入点。

| 秒 | 画面 | 能否提轨迹 |
|----|------|------------|
| 38–43 | 腰部/半身特写；模特可能已在动 | **不能**作窗头 |
| 44–51 | 全身侧视连续弓步（本地 1s 拼图） | **能**。你上次目视 41–48，请确认 41–43 是否已全身 |

人工看的是「这一秒能不能读完整行程」；字幕估窗看的是「这一秒像不像在练」。差的就是窗头那几秒特写。特写本身不是换片的理由，只是入点要推后。

事故（口播段）：`plank-side-01` 旧 0–24s，有效约 **12–17s**；`db-row-side-01` 旧 18–70s，有效约 **1:55–2:00**。

2026-08-22：look-window 已全部 `user-verified`。样片是**示范与轨迹**真源，不是规则阈值真源（见下节）。

## 样片对写规则有什么用（FR-040 vs FR-067/069）

本批参考窗可以当作产品里「这个动作长什么样」的**视觉标准演示**，但 **不能**直接变成 `*-rules.md` 里的角度阈值。深蹲/俯卧撑已经证明：规则来自文献锚点 + 消费级放宽 + 机位几何（见 `squat-rules.md` 依据表）；样片负责示范窗原片和 2D 骨轨迹（FR-067/068）。FR-069 只允许用轨迹**校准或对照**阈值，且必须再走 RULE-BOUNDARY。

| 层 | 样片能做什么 | 样片不能做什么 |
|----|----------------|----------------|
| **定性规格** | 定**本条规则覆盖的动作模式**（双侧臀桥不是单腿；原地弓步不是走弓步）、机位该看见哪些关节、hold vs reps、一次完整 ROM 的起止 | 不能代替规则 ID、严重度、提示文案、相位状态机 |
| **驱动量** | PoseDump 后看哪条角真正在动（臀桥≈髋伸、平板≈肩髋踝一线），避免写错 drive | 不能把示范者某帧的 73° 抄成全用户报错线 |
| **校准（FR-069）** | 示范循环的 `driveDeg` 分布，用来核对「bottom / stand 分界是否会被标准动作跨过」 | 不能跳过矩阵 ok/critical_ok/fault；侧视片推不出膝内扣、肘外展 |
| **夹具** | 清洗后的 Pose 帧可作 matrix 的 `ok` 种子 | 口播特写、教练入画、坐姿 OHP 备选 ≠ catalog 站姿 |

### 变式与机位（产品边界）

**锁变式** = 第一条 coachable 规则只覆盖样片里的那一种动作模式，不是把整个动作家族冻结。

- **仍是同一个 catalog id**：握距宽/窄、轻微站距差、示范者节奏不同——Pose 往往看不清或不应报错。高位下拉先做「杆拉至上胸、肘向下向后」一条；宽距/窄距默认仍是 `lat-pulldown`，最多以后加示范窗片，不复制 RULE-BOUNDARY。
- **才拆新 id**：驱动关节、相位或对错集会打架。已有先例：`plank` ≠ `side-plank`；走弓步/反向弓步若与原地弓步的错误集冲突再拆。不要为握距先拆。
- 未来兼容变式：优先「同一动作 + 多条样片/可选 cue」；只有规则会互相误杀时才新开 `*-rules.md`。

**锁机位** = 按机位规格（FR-089）决定评估桶与 `requiredClipCameras`，详情页用 `defaultHint`（FR-002），不是禁止用户换朝向。

- catalog `cameraHint` / `defaultHint`：`side` = 矢状面，`front` = 冠状面。Scout 另允许 `three_quarter`。**3/4 ≠ 必须脸朝镜头，也不是只能背面。**
- 训练页已去掉手动「自/侧」开关；有正+侧轨迹时后台识别换示范片。用户站在 `countPlanes` 之外时：引导摆机，并像深蹲膝内扣那样**关掉该平面会假阳性的规则**。
- 同一动作可补第二机位，仍是一个 exercise id。已接线 Scout 10 条不补规格（祖父条款）。

工程顺序仍是：**先**机位规格，**再**裁参考片 + 提轨迹，**再**对照该动作规格与 primary 窗写 `*-rules.md`。规则与样片冲突时改规则或换窗，不要在 UI 里对像素写校验。

## 流程

```
填 camera-planes/specs.json（FR-089；祖父 10 条跳过）
  → 模型按规格出 clips.json（不下片；YouTube 检索用 ingest --yt-search / yt-dlp，禁止 WebFetch watch 页）
  → 你目视链接 + 时间点，回复授权（可一次点名多条并改窗）
  → 一条命令整批 download-only，再一条命令整批 crop-only
  → 运镜可疑的条跑 --check-camera-motion
  → 人工确认候选 mp4 → trajectory-extract
  → 示范窗原片 + 轨迹 JSON
并行：每个 coachable 仍走 RULE-BOUNDARY（rules → 矩阵 → core → App）
```

视频产示范素材与轨迹；规则另写，用轨迹校对，不替代。

下一波扩库（111 条）见 [`asset-scout/expansion-queue.json`](./asset-scout/expansion-queue.json) 与 [`GROKBOT-SCOUT.md`](./asset-scout/GROKBOT-SCOUT.md)。

## 本批 10 个动作

深蹲、俯卧撑（已入库授权）+ 臀桥、弓步蹲、平板支撑、哑铃划船、站姿推举、杠铃卧推、罗马尼亚硬拉、引体向上。

这 10 条是 FR-089 **祖父条款**：不补机位规格、不改现有侧片接线。下一批 catalog 升级必须先写规格，禁止再默认「侧面 ≥1、正面可选」。

## Phase E（胸部 5 条）

机位按最佳收、无可选。9 条已按你核的短窗 `authorized`。8 条锁定机位已 PoseDump。`dip-front-01` 绕拍只作示范窗，正面轨迹另找固定机位全身片。

## Phase F（肩 5 条）

评估桶已确认。必收 5 条已核窗 `authorized`（派克 0:02–0:11，NASM 短示范）。optional 不进清单。已整批 download + crop + PoseDump。

```bash
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --download-only --scout-id \
  lateral-raise-front-01,front-raise-side-01,rear-delt-fly-three_quarter-01,face-pull-three_quarter-01,pike-pushup-side-01

pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --crop-only --scout-id \
  lateral-raise-front-01,front-raise-side-01,rear-delt-fly-three_quarter-01,face-pull-three_quarter-01,pike-pushup-side-01
```

## ingest

```bash
# YouTube 检索（yt-dlp，不要 WebFetch）
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --yt-search "how to dumbbell fly" --max 8

# 一次授权后整批下全片（一次网络允许即可）
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --download-only --scout-id \
  db-fly-three_quarter-01,db-fly-front-01,dip-three_quarter-01,dip-front-01,incline-pushup-side-01,incline-pushup-front-01,cable-crossover-front-01,chest-press-machine-side-01,chest-press-machine-three_quarter-01

# 同一批按核窗裁参考片
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --crop-only --scout-id \
  db-fly-three_quarter-01,db-fly-front-01,dip-three_quarter-01,dip-front-01,incline-pushup-side-01,incline-pushup-front-01,cable-crossover-front-01,chest-press-machine-side-01,chest-press-machine-three_quarter-01

# 单条（兼容旧用法）
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --download-only --scout-id glute-bridge-side-01

pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --crop-only --scout-id glute-bridge-side-01

# 已裁参考片上 PoseDump（绕拍片会 skip）
pnpm --filter @fitness-coach/trajectory-source-ingest ingest -- \
  --pose-only --scout-id glute-bridge-side-01
```

`--url` / `--exercise` / `--camera` 可省略（用清单）。给出则必须与该条一致。多条 `--scout-id` 时不要再传这些覆盖项。
