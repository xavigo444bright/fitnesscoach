import { describe, expect, it } from "vitest";
import { argValue, argValues } from "./util.js";

describe("argv helpers", () => {
  it("reads repeated --scout-id flags", () => {
    const argv = ["--scout-id", "a", "--download-only", "--scout-id", "b,c"];
    expect(argValue(argv, "--scout-id")).toBe("a");
    expect(argValues(argv, "--scout-id")).toEqual(["a", "b,c"]);
  });
});
