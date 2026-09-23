# 扩库队列（Grokbot scout）

> 机器真源：[`expansion-queue.json`](./expansion-queue.json)。协议：[`GROKBOT-SCOUT.md`](./GROKBOT-SCOUT.md)。
> Phase G **12** + Phase H **99** = **111** 条。机位已写入 `camera-planes/specs.json`。

## Phase G（已在动作库，优先找片）

| id | 名称 | 器械 | 评估桶 | 必收 | 窗 |
|---|---|---|---|---|---|
| lat-pulldown | 高位下拉 | machine | front | front | reps |
| seated-row | 坐姿划船 | machine | side | side | reps |
| superman | 超人式 | bodyweight | side | side | reps |
| band-row | 弹力带划船 | band | side | side | reps |
| leg-press | 腿举 | machine | side | side | reps |
| calf-raise | 提踵 | bodyweight | side | side | reps |
| goblet-squat | 高脚杯深蹲 | dumbbell | side | side | reps |
| dead-bug | 死虫式 | bodyweight | side | side | reps |
| bird-dog | 鸟狗式 | bodyweight | side | side | reps |
| crunch | 卷腹 | bodyweight | side | side | reps |
| side-plank | 侧平板 | bodyweight | front | front | hold |
| hanging-knee-raise | 悬垂提膝 | bodyweight | side | side | reps |

## Phase H（新动作，尚未进 catalog）

### 胸（16）

| id | 名称 | 器械 | 评估桶 | 必收 | 窗 |
|---|---|---|---|---|---|
| incline-bench-press | 上斜杠铃卧推 | barbell | side | side | reps |
| decline-bench-press | 下斜杠铃卧推 | barbell | side | side | reps |
| db-bench-press | 哑铃卧推 | dumbbell | dual_or_three_quarter | three_quarter | reps |
| close-grip-bench | 窄距卧推 | barbell | side | side | reps |
| pec-deck | 蝴蝶机夹胸 | machine | front | front | reps |
| decline-pushup | 下斜俯卧撑 | bodyweight | dual_or_three_quarter | side+front | reps |
| floor-press | 地板卧推 | dumbbell | side | side | reps |
| landmine-press | 地雷管推举 | other | dual_or_three_quarter | three_quarter | reps |
| squeeze-press | 哑铃夹胸推 | dumbbell | dual_or_three_quarter | three_quarter | reps |
| kneeling-pushup | 跪姿俯卧撑 | bodyweight | side | side | reps |
| diamond-pushup | 钻石俯卧撑 | bodyweight | side | side | reps |
| skull-crusher | 仰卧臂屈伸 | barbell | side | side | reps |
| tricep-pushdown | 绳索下压 | machine | side | side | reps |
| tricep-kickback | 臂屈伸后踢 | dumbbell | side | side | reps |
| bench-dip | 凳上臂屈伸 | bodyweight | side | side | reps |
| machine-tricep-extension | 器械臂屈伸 | machine | side | side | reps |

### 肩（7）

| id | 名称 | 器械 | 评估桶 | 必收 | 窗 |
|---|---|---|---|---|---|
| seated-db-press | 坐姿哑铃推举 | dumbbell | side | side | reps |
| arnold-press | 阿诺德推举 | dumbbell | dual_or_three_quarter | three_quarter | reps |
| shrug | 耸肩 | barbell | front | front | reps |
| reverse-pec-deck | 反向蝴蝶机 | machine | front | front | reps |
| machine-shoulder-press | 器械推肩 | machine | side | side | reps |
| push-press | 借力推举 | barbell | side | side | reps |
| overhead-tricep-extension | 过头臂屈伸 | dumbbell | side | side | reps |

### 背（21）

| id | 名称 | 器械 | 评估桶 | 必收 | 窗 |
|---|---|---|---|---|---|
| barbell-row | 杠铃划船 | barbell | side | side | reps |
| t-bar-row | T 杠划船 | other | side | side | reps |
| chest-supported-row | 胸撑划船 | dumbbell | side | side | reps |
| inverted-row | 反向划船 | bodyweight | side | side | reps |
| straight-arm-pulldown | 直臂下拉 | machine | side | side | reps |
| db-pullover | 哑铃上拉 | dumbbell | side | side | reps |
| good-morning | 早安式 | barbell | side | side | reps |
| back-extension | 反向挺身 | machine | side | side | reps |
| renegade-row | 金刚推举划船 | dumbbell | dual_or_three_quarter | three_quarter | reps |
| band-pull-apart | 弹力带直臂开合 | band | front | front | reps |
| machine-high-row | 高位划船器 | machine | dual_or_three_quarter | three_quarter | reps |
| prone-y-raise | 俯卧 Y 举 | bodyweight | dual_or_three_quarter | three_quarter | reps |
| barbell-curl | 杠铃弯举 | barbell | side | side | reps |
| db-curl | 哑铃弯举 | dumbbell | side | side | reps |
| hammer-curl | 锤式弯举 | dumbbell | side | side | reps |
| preacher-curl | 托臂弯举 | dumbbell | side | side | reps |
| incline-db-curl | 上斜哑铃弯举 | dumbbell | side | side | reps |
| concentration-curl | 集中弯举 | dumbbell | side | side | reps |
| cable-curl | 绳索弯举 | machine | side | side | reps |
| reverse-curl | 反握弯举 | barbell | side | side | reps |
| dead-hang | 悬垂放松 | bodyweight | front | front | hold |

### 下肢（29）

| id | 名称 | 器械 | 评估桶 | 必收 | 窗 |
|---|---|---|---|---|---|
| deadlift | 传统硬拉 | barbell | side | side | reps |
| trap-bar-deadlift | 六角杠硬拉 | other | side | side | reps |
| hip-thrust | 臀冲 | barbell | side | side | reps |
| bulgarian-split-squat | 保加利亚分腿蹲 | bodyweight | side | side | reps |
| split-squat | 分腿蹲 | bodyweight | side | side | reps |
| step-up | 上台阶 | bodyweight | side | side | reps |
| leg-extension | 腿屈伸 | machine | side | side | reps |
| lying-leg-curl | 俯卧腿弯举 | machine | side | side | reps |
| seated-leg-curl | 坐姿腿弯举 | machine | side | side | reps |
| hack-squat | 哈克深蹲 | machine | side | side | reps |
| front-squat | 前蹲 | barbell | side | side | reps |
| seated-calf-raise | 坐姿提踵 | machine | side | side | reps |
| hip-abduction | 髋外展 | machine | front | front | reps |
| hip-adduction | 髋内收 | machine | front | front | reps |
| nordic-curl | 北欧腿弯举 | bodyweight | side | side | reps |
| kettlebell-swing | 壶铃摆荡 | other | side | side | reps |
| glute-kickback | 臀后踢 | machine | side | side | reps |
| cable-pull-through | 绳索穿体 | machine | side | side | reps |
| single-leg-rdl | 单腿罗马尼亚硬拉 | dumbbell | side | side | reps |
| pistol-squat | 手枪深蹲 | bodyweight | side | side | reps |
| cossack-squat | 哥萨克深蹲 | bodyweight | front | front | reps |
| lateral-lunge | 侧弓步 | bodyweight | front | front | reps |
| curtsy-lunge | 屈膝行礼蹲 | bodyweight | dual_or_three_quarter | three_quarter | reps |
| thruster | 推举深蹲 | barbell | side | side | reps |
| wall-sit | 靠墙静蹲 | bodyweight | side | side | hold |
| single-leg-glute-bridge | 单腿臀桥 | bodyweight | side | side | reps |
| frog-pump | 蛙式臀桥 | bodyweight | side | side | reps |
| sissy-squat | 西施深蹲 | bodyweight | side | side | reps |
| rack-pull | 架上拉 | barbell | side | side | reps |

### 核心（26）

| id | 名称 | 器械 | 评估桶 | 必收 | 窗 |
|---|---|---|---|---|---|
| russian-twist | 俄罗斯转体 | bodyweight | front | front | reps |
| hanging-leg-raise | 悬垂直腿举 | bodyweight | side | side | reps |
| ab-wheel | 健腹轮 | other | side | side | reps |
| cable-crunch | 绳索卷腹 | machine | side | side | reps |
| sit-up | 仰卧起坐 | bodyweight | side | side | reps |
| v-up | V 字起 | bodyweight | side | side | reps |
| hollow-hold | 空心支撑 | bodyweight | side | side | hold |
| mountain-climber | 登山者 | bodyweight | side | side | reps |
| bicycle-crunch | 自行车卷腹 | bodyweight | dual_or_three_quarter | three_quarter | reps |
| woodchop | 伐木式 | machine | dual_or_three_quarter | three_quarter | reps |
| pallof-press | 帕洛夫推 | machine | front | front | hold |
| reverse-crunch | 反向卷腹 | bodyweight | side | side | reps |
| flutter-kick | 交替踢腿 | bodyweight | side | side | reps |
| toe-touch | 仰卧摸脚 | bodyweight | side | side | reps |
| side-crunch | 侧卷腹 | bodyweight | front | front | reps |
| machine-crunch | 卷腹器 | machine | side | side | reps |
| captain-chair-knee-raise | 罗马椅提膝 | machine | side | side | reps |
| plank-shoulder-tap | 平板摸肩 | bodyweight | front | front | reps |
| plank-hip-dip | 平板侧摆髋 | bodyweight | front | front | reps |
| l-sit | L 坐 | bodyweight | side | side | hold |
| windshield-wiper | 雨刷式 | bodyweight | front | front | reps |
| landmine-rotation | 地雷管转体 | other | front | front | reps |
| heel-tap | 摸脚跟 | bodyweight | front | front | reps |
| decline-sit-up | 下斜仰卧起坐 | bodyweight | side | side | reps |
| copenhagen-plank | 哥本哈根侧撑 | bodyweight | front | front | hold |
| scissor-kick | 剪刀腿 | bodyweight | side | side | reps |

## 不拆新 id

- `chin-up`：与 pullup 同一驱动，别名已挂在 pullup
- `walking-lunge`：与 lunge 同行程，错误集未打架前不拆
- `reverse-lunge`：同上，仍用 lunge
- `cable-fly`：站姿龙门夹胸已是 cable-crossover
- `one-arm-db-row`：已是 db-row
- `military-press`：已是 ohp
- `sumo-deadlift`：本波锁 conventional deadlift，站距差不拆
- `box-squat`：与 squat 同行程
- `upright-row`：肩撞击风险高，且与 face-pull 开合接近
- `behind-neck-press`：不安全变式，不收录
- `farmer-carry`：位移动作，2D 计次弱
- `burpee`：复合爆发，本波不做
- `box-jump`：plyo，本波不做
- `snatch`：举重三翻，本波不做
- `clean-and-jerk`：举重三翻，本波不做
- `muscle-up`：高技能，本波不做
- `smith-machine-variants`：史密斯变式并入对应自由重量 id
