import { describe, expect, it } from "vitest";
import {
  LANDMARK_FRAME_INSET,
  landmarkHorizontallyOut,
  landmarkInFrame,
  landmarkReliable,
} from "./landmarks.js";

describe("landmark frame reliability", () => {
  it("画内高 vis 可靠；贴边/出画不可靠", () => {
    expect(landmarkInFrame({ x: 0.5, y: 0.5, visibility: 1 })).toBe(true);
    expect(landmarkReliable({ x: 0.5, y: 0.5, visibility: 1 })).toBe(true);
    expect(
      landmarkInFrame({ x: 0.5, y: 1 - LANDMARK_FRAME_INSET / 2 }),
    ).toBe(false);
    expect(
      landmarkReliable({ x: 0.02, y: 0.4, visibility: 0.9 }),
    ).toBe(false);
  });

  it("左右出画与低 vis", () => {
    expect(landmarkHorizontallyOut({ x: 0.01, y: 0.4 })).toBe(true);
    expect(landmarkHorizontallyOut({ x: 0.99, y: 0.4 })).toBe(true);
    expect(landmarkHorizontallyOut({ x: 0.5, y: 0.4 })).toBe(false);
    expect(landmarkReliable({ x: 0.5, y: 0.5, visibility: 0.1 })).toBe(false);
    expect(landmarkReliable({ x: 0.5, y: 0.5 })).toBe(true);
  });
});
