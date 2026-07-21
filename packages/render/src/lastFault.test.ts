import { describe, expect, it } from "vitest";
import {
  beginFaultCycle,
  celebrateFixedFaults,
  initialLastFaultState,
  noteCycleFaults,
  sealRejectedCycle,
  toggleFaultReview,
} from "./lastFault.js";

const DEPTH = {
  id: "rep-shallow",
  message: "蹲得不够深，未计入次数",
  severity: "error" as const,
};

describe("lastFault memory (UX-008)", () => {
  it("seals cycle buffer on reject", () => {
    let s = initialLastFaultState();
    s = beginFaultCycle(s);
    s = noteCycleFaults(s, [DEPTH]);
    s = sealRejectedCycle(s);
    expect(s.issues).toEqual([DEPTH]);
    expect(s.cycleBuffer).toEqual([]);
  });

  it("uses fallback when buffer empty", () => {
    let s = initialLastFaultState();
    s = sealRejectedCycle(s, DEPTH);
    expect(s.issues[0]?.id).toBe("rep-shallow");
  });

  it("celebrates on next counted rep then clears", () => {
    let s = sealRejectedCycle(initialLastFaultState(), DEPTH);
    const { state, recovered } = celebrateFixedFaults(s, {
      "rep-shallow": "很好，蹲得更深了",
    });
    expect(recovered).toEqual([
      { id: "rep-shallow", message: "很好，蹲得更深了" },
    ]);
    expect(state.issues).toEqual([]);
  });

  it("toggle review only when issues exist", () => {
    let s = initialLastFaultState();
    s = toggleFaultReview(s);
    expect(s.reviewing).toBe(false);
    s = sealRejectedCycle(s, DEPTH);
    s = toggleFaultReview(s);
    expect(s.reviewing).toBe(true);
  });
});
