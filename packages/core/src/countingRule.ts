/**
 * 计次规则：这一次怎样才算完成，以及没完成时屏幕上那句字。
 * 不推动行程状态机。
 */

import { landmarkInFrame } from "./landmarks.js";
import {
  DEFAULT_LAT_PULLDOWN_PHASE_CONFIG,
  latPulldownWorkingElbowAngle,
} from "./phase.js";
import { LandmarkIndex, type Pose } from "./types.js";
import { lateralShortMessage } from "./attemptRegions.js";

const SHORT_MESSAGE: Record<string, string> = {
  squat: "蹲得不够深，臀部再下沉一些",
  "goblet-squat": "蹲得不够深，臀部再下沉一些",
  lunge: "再蹲深一些，后膝再低",
  "leg-press": "再屈膝一些，不要只做半程",
  "calf-raise": "脚跟再抬高一些",
  rdl: "髋再向后折一些",
  "glute-bridge": "髋再往上顶",
  "bench-press": "杠没落到胸口，再下放一些",
  pushup: "再降低一些，胸口靠近地面",
  dip: "再降低一些，肘收到身侧",
  "incline-pushup": "再降低一些，肘收到身侧",
  "pike-pushup": "再降低一些，头靠近地面",
  "chest-press-machine": "再收到胸口一些",
  ohp: "再推到肩的上方",
  "lat-pulldown": "再拉低一些，杆收到上胸",
  "seated-row": "再往后拉，肘收到髋侧",
  "db-row": "再往后拉，肘收到髋侧",
  "band-row": "再往后拉，肘收到髋侧",
  pullup: "再拉高一些，下巴过杆",
  "face-pull": "再拉近一些，手收到脸前",
  "lateral-raise": "再抬高一些，手抬到肩",
  "front-raise": "再抬高一些，手抬到肩",
  "rear-delt-fly": "再向两侧打开一些",
  "db-fly": "再打开一些",
  "cable-crossover": "再打开一些",
  superman: "胸口和腿再抬高一些",
  "dead-bug": "对侧手脚再伸远一些",
  "bird-dog": "对侧手脚再伸直一些",
  crunch: "再卷起来一些",
  "hanging-knee-raise": "膝盖再抬高一些",
  plank: "身体撑成一条线",
  "side-plank": "身体撑成一条线",
};

/** 叠点让整帧没有读数时的提示。不拦截，人可以不照做。 */
export const STACK_CAMERA_HINT = "稍微侧一些";

/** 高位下拉肩肘在、手和杆不在。不拦计次，不锁示范窗。 */
export const LAT_PULLDOWN_HANDS_HINT = "手和杆入画";

/**
 * 肩、肘在画面里，两侧的腕都不在。
 * 有一侧还能读出肘角时不提示。人离开、肩也不在时交给原来的站位句。
 */
export function latPulldownHandsOut(pose: Pose): boolean {
  const shoulders = [
    pose[LandmarkIndex.LeftShoulder],
    pose[LandmarkIndex.RightShoulder],
  ];
  const elbows = [pose[LandmarkIndex.LeftElbow], pose[LandmarkIndex.RightElbow]];
  if (!shoulders.some(landmarkInFrame) || !elbows.some(landmarkInFrame)) {
    return false;
  }
  const wrists = [pose[LandmarkIndex.LeftWrist], pose[LandmarkIndex.RightWrist]];
  if (wrists.some(landmarkInFrame)) return false;
  return latPulldownWorkingElbowAngle(pose) == null;
}

export function shortMessageFor(exerciseId: string, pose?: Pose): string {
  if (exerciseId === "lateral-raise" && pose) return lateralShortMessage(pose);
  if (exerciseId === "lat-pulldown" && pose) {
    const deg = latPulldownWorkingElbowAngle(pose);
    if (
      deg != null &&
      deg <= DEFAULT_LAT_PULLDOWN_PHASE_CONFIG.bottomBelowDeg
    ) {
      return "";
    }
  }
  return SHORT_MESSAGE[exerciseId] ?? "再做到位一些";
}
