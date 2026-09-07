import { describe, expect, it } from "vitest";
import {
  cuesFromValidation,
  initialFeedbackBarState,
  recoverMessageByIdFor,
  stepFeedbackBar,
  type FeedbackBarCue,
} from "./feedbackBar.js";

const depth: FeedbackBarCue = {
  id: "squat-depth",
  severity: "error",
  message: "蹲得不够深",
};
const lean: FeedbackBarCue = {
  id: "torso-upright",
  severity: "warning",
  message: "躯干前倾过多",
};
const valgus: FeedbackBarCue = {
  id: "knee-valgus-l",
  severity: "error",
  message: "左膝内扣",
};

describe("stepFeedbackBar (M3-T3 / VT-P3A-003 / FR-045)", () => {
  it("keeps at most 2 items and prefers error over warning", () => {
    let state = initialFeedbackBarState();
    const { items, state: next } = stepFeedbackBar(
      state,
      [lean, depth, valgus],
      0,
    );
    state = next;
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.severity === "error")).toBe(true);
    expect(items.map((i) => i.ruleId).sort()).toEqual([
      "knee-valgus-l",
      "squat-depth",
    ]);
    expect(state.prevCorrectingIds).toHaveLength(2);
  });

  it("emits recovered then clears after timeout", () => {
    let state = initialFeedbackBarState();
    ({ state } = stepFeedbackBar(state, [valgus], 0));
    const mid = stepFeedbackBar(state, [], 100);
    expect(mid.items).toHaveLength(1);
    expect(mid.items[0]).toMatchObject({
      ruleId: "knee-valgus-l",
      phase: "recovered",
      severity: "correct",
      message: "很好，膝盖稳住了",
    });
    const done = stepFeedbackBar(mid.state, [], 2000);
    expect(done.items).toHaveLength(0);
  });

  it("cuesFromValidation only keeps triggered", () => {
    const cues = cuesFromValidation({
      results: [
        {
          id: "a",
          triggered: true,
          severity: "error",
          message: "x",
        },
        {
          id: "b",
          triggered: false,
          severity: "warning",
          message: "y",
        },
      ],
    });
    expect(cues).toEqual([{ id: "a", severity: "error", message: "x" }]);
  });
});

describe("recoverMessageByIdFor", () => {
  it("划船 recovered 不说深蹲", () => {
    const map = recoverMessageByIdFor("db-row");
    expect(map["rep-shallow"]).toMatch(/拉/);
    expect(map["row-depth"]).toMatch(/拉/);
    expect(map["rep-shallow"]).not.toMatch(/蹲/);
  });

  it("RDL / 引体 / 飞鸟 recovered 不说深蹲", () => {
    expect(recoverMessageByIdFor("rdl")["rep-shallow"]).toMatch(/铰链/);
    expect(recoverMessageByIdFor("pullup")["rep-shallow"]).toMatch(/拉/);
    expect(recoverMessageByIdFor("db-fly")["rep-shallow"]).toMatch(/打开/);
    expect(recoverMessageByIdFor("dip")["rep-shallow"]).toMatch(/降/);
    expect(recoverMessageByIdFor("incline-pushup")["rep-shallow"]).toMatch(/降/);
    expect(recoverMessageByIdFor("cable-crossover")["rep-shallow"]).toMatch(/打开/);
    expect(recoverMessageByIdFor("chest-press-machine")["rep-shallow"]).toMatch(/收/);
    expect(recoverMessageByIdFor("lateral-raise")["rep-shallow"]).toMatch(/抬/);
    expect(recoverMessageByIdFor("front-raise")["rep-shallow"]).toMatch(/抬/);
    expect(recoverMessageByIdFor("rear-delt-fly")["rep-shallow"]).toMatch(/打开/);
    expect(recoverMessageByIdFor("face-pull")["rep-shallow"]).toMatch(/拉/);
    expect(recoverMessageByIdFor("pike-pushup")["rep-shallow"]).toMatch(/降/);
    expect(recoverMessageByIdFor("rdl")["rep-shallow"]).not.toMatch(/蹲/);
    expect(recoverMessageByIdFor("pullup")["rep-shallow"]).not.toMatch(/蹲/);
    expect(recoverMessageByIdFor("db-fly")["rep-shallow"]).not.toMatch(/蹲/);
    expect(recoverMessageByIdFor("dip")["rep-shallow"]).not.toMatch(/蹲/);
    expect(recoverMessageByIdFor("incline-pushup")["rep-shallow"]).not.toMatch(/蹲/);
    expect(recoverMessageByIdFor("cable-crossover")["rep-shallow"]).not.toMatch(/蹲/);
    expect(recoverMessageByIdFor("chest-press-machine")["rep-shallow"]).not.toMatch(/蹲/);
    expect(recoverMessageByIdFor("lateral-raise")["rep-shallow"]).not.toMatch(/蹲/);
    expect(recoverMessageByIdFor("front-raise")["rep-shallow"]).not.toMatch(/蹲/);
    expect(recoverMessageByIdFor("rear-delt-fly")["rep-shallow"]).not.toMatch(/蹲/);
    expect(recoverMessageByIdFor("face-pull")["rep-shallow"]).not.toMatch(/蹲/);
    expect(recoverMessageByIdFor("pike-pushup")["rep-shallow"]).not.toMatch(/蹲/);
  });

  it("深蹲仍用蹲得更深", () => {
    expect(recoverMessageByIdFor("squat")["rep-shallow"]).toMatch(/蹲/);
  });
});
