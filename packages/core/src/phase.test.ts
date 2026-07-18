import { describe, expect, it } from "vitest";
import { FIXTURES, buildSquatPose } from "./fixtures/index.js";
import {
  DEFAULT_SQUAT_PHASE_CONFIG,
  initialPhaseState,
  runPhaseSequence,
  squatKneeAngle,
  stepPhase,
} from "./phase.js";
import type { Pose } from "./types.js";

describe("VT-P1-004 相位转移顺序", () => {
  it("FX-SEQ-5REPS：stand→descend→bottom→ascend 循环", () => {
    const seq = FIXTURES["FX-SEQ-5REPS"].sequence!;
    const transitions = runPhaseSequence(seq);
    // 首相位 stand
    expect(transitions[0]).toBe("stand");
    // 每个相邻转移必须符合合法顺序
    const legalNext: Record<string, string[]> = {
      stand: ["descend"],
      descend: ["bottom", "ascend"],
      bottom: ["ascend"],
      ascend: ["stand", "descend"],
    };
    for (let i = 1; i < transitions.length; i += 1) {
      expect(legalNext[transitions[i - 1]]).toContain(transitions[i]);
    }
    // 5 次深蹲应至少出现 5 次 bottom
    expect(transitions.filter((p) => p === "bottom").length).toBe(5);
  });
});

describe("端点相位需 5 帧确认", () => {
  it("stand→bottom 少于 5 帧不切换", () => {
    let state = initialPhaseState();
    const bottom = buildSquatPose({ kneeDeg: 85, torsoDeg: 172 });
    // 先离开 stand（进入 descend）
    const mid = buildSquatPose({ kneeDeg: 130, torsoDeg: 170 });
    state = stepPhase(state, mid).state;
    expect(state.phase).toBe("descend");
    // 4 帧 bottom 条件，仍未确认
    for (let i = 0; i < 4; i += 1) state = stepPhase(state, bottom).state;
    expect(state.phase).toBe("descend");
    // 第 5 帧确认
    state = stepPhase(state, bottom).state;
    expect(state.phase).toBe("bottom");
  });
});

describe("squatKneeAngle", () => {
  it("两侧均值；缺一侧用另一侧", () => {
    const stand = FIXTURES["FX-SQUAT-STAND"].pose!;
    expect(squatKneeAngle(stand)!).toBeGreaterThan(160);
    const partial: Pose = [...stand];
    partial[25] = undefined; // 去掉左膝
    expect(squatKneeAngle(partial)).not.toBeNull();
  });

  it("无关键点返回 null，stepPhase 保持相位", () => {
    const empty: Pose = [];
    expect(squatKneeAngle(empty)).toBeNull();
    const state = initialPhaseState();
    const res = stepPhase(state, empty);
    expect(res.changed).toBe(false);
    expect(res.state.phase).toBe("stand");
  });
});

describe("配置", () => {
  it("默认阈值取自 squat-rules.md", () => {
    expect(DEFAULT_SQUAT_PHASE_CONFIG.standAboveDeg).toBe(160);
    expect(DEFAULT_SQUAT_PHASE_CONFIG.bottomBelowDeg).toBe(100);
    expect(DEFAULT_SQUAT_PHASE_CONFIG.confirmFrames).toBe(5);
  });
});
