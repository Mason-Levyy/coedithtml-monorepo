import { describe, expect, it } from "vitest";
import {
  MAX_STICKY_WIDTH,
  MIN_STICKY_HEIGHT,
  MIN_STICKY_WIDTH,
} from "@coedithtml/protocol";
import { isInside, resizeRect } from "./resize-math";

const START = { x: 100, y: 50, width: 200, height: 100 };

describe("resizeRect", () => {
  it("pulls the dragged side and leaves the opposite one where it was", () => {
    expect(resizeRect(START, "e", { x: 40, y: 0 }, false)).toEqual({
      x: 100,
      y: 50,
      width: 240,
      height: 100,
    });
    expect(resizeRect(START, "s", { x: 0, y: 30 }, false)).toEqual({
      x: 100,
      y: 50,
      width: 200,
      height: 130,
    });
  });

  it("moves the origin when the north or west side is the one dragged", () => {
    expect(resizeRect(START, "w", { x: -40, y: 0 }, false)).toEqual({
      x: 60,
      y: 50,
      width: 240,
      height: 100,
    });
    expect(resizeRect(START, "nw", { x: -40, y: -20 }, false)).toEqual({
      x: 60,
      y: 30,
      width: 240,
      height: 120,
    });
  });

  it("holds a corner fixed while the opposite corner is dragged", () => {
    const resized = resizeRect(START, "ne", { x: 50, y: -25 }, false);

    expect(resized.x).toBe(100);
    expect(resized.y + resized.height).toBe(150);
    expect(resized).toMatchObject({ width: 250, height: 125 });
  });

  it("resizes on one axis only for an edge handle", () => {
    expect(resizeRect(START, "n", { x: 999, y: -20 }, false)).toMatchObject({
      width: 200,
      height: 120,
    });
    expect(resizeRect(START, "w", { x: -40, y: 999 }, false)).toMatchObject({
      height: 100,
    });
  });

  describe("with Shift held", () => {
    it("keeps the ratio it started with", () => {
      const resized = resizeRect(START, "se", { x: 100, y: 0 }, true);

      expect(resized.width / resized.height).toBeCloseTo(2);
      expect(resized).toMatchObject({ width: 300, height: 150 });
    });

    it("follows whichever axis the reader pulled further", () => {
      const resized = resizeRect(START, "se", { x: 10, y: 100 }, true);

      expect(resized).toMatchObject({ width: 400, height: 200 });
    });

    it("is ignored on an edge handle, which has only one axis", () => {
      expect(resizeRect(START, "e", { x: 100, y: 0 }, true)).toMatchObject({
        width: 300,
        height: 100,
      });
    });
  });

  describe("clamping", () => {
    it("stops at the minimum without letting the fixed side drift", () => {
      const resized = resizeRect(START, "w", { x: 9999, y: 0 }, false);

      expect(resized.width).toBe(MIN_STICKY_WIDTH);
      expect(resized.x + resized.width).toBe(300);
    });

    it("stops at the maximum, so one drag cannot cover the artifact", () => {
      expect(resizeRect(START, "se", { x: 99999, y: 99999 }, false).width).toBe(
        MAX_STICKY_WIDTH,
      );
      expect(resizeRect(START, "s", { x: 0, y: -9999 }, false).height).toBe(
        MIN_STICKY_HEIGHT,
      );
    });
  });

  it("survives a box that has not been measured yet", () => {
    const flat = { x: 0, y: 0, width: 0, height: 0 };

    expect(() => resizeRect(flat, "se", { x: 10, y: 10 }, true)).not.toThrow();
  });
});

describe("isInside", () => {
  it("answers for the retract test at the edges as well as the middle", () => {
    expect(isInside(START, { x: 200, y: 100 })).toBe(true);
    expect(isInside(START, { x: 100, y: 50 })).toBe(true);
    expect(isInside(START, { x: 300, y: 150 })).toBe(true);
    expect(isInside(START, { x: 301, y: 100 })).toBe(false);
    expect(isInside(START, { x: 200, y: 49 })).toBe(false);
  });
});
