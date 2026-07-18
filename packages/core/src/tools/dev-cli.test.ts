import { describe, expect, it } from "vitest";
import { runDevReport } from "./dev-cli.js";

describe("dev-cli 调试报告", () => {
  it("输出各夹具与序列摘要", () => {
    const lines: string[] = [];
    runDevReport((l) => lines.push(l));
    const text = lines.join("\n");
    expect(text).toContain("FX-SQUAT-STAND");
    expect(text).toContain("FX-SEQ-5REPS 相位转移");
    expect(text).toContain("count=5");
  });
});
