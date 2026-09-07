import { describe, expect, it } from "vitest";
import { CROP_INPUT_PREROLL_SEC, ffmpegCropSeek } from "./crop.js";

describe("ffmpegCropSeek", () => {
  it("keeps early in-points accurate with preroll inside the file", () => {
    expect(ffmpegCropSeek(0)).toEqual({ inputSs: 0, outputSs: 0 });
    expect(ffmpegCropSeek(1)).toEqual({ inputSs: 0, outputSs: 1 });
    expect(ffmpegCropSeek(2)).toEqual({
      inputSs: 0,
      outputSs: CROP_INPUT_PREROLL_SEC,
    });
  });

  it("coarse-seeks late windows then decodes the last preroll seconds", () => {
    expect(ffmpegCropSeek(508)).toEqual({
      inputSs: 508 - CROP_INPUT_PREROLL_SEC,
      outputSs: CROP_INPUT_PREROLL_SEC,
    });
  });
});
