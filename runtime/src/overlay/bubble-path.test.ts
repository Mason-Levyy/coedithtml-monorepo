import { describe, expect, it } from "vitest";
import { bubblePath, centreOf, tailNodes, type Size } from "./bubble-path";

const size: Size = { width: 200, height: 100 };

describe("tailNodes", () => {
  it("leaves through the edge the tip is facing", () => {
    expect(tailNodes(size, { x: 320, y: 50 })?.first).toMatchObject({ x: 200 });
    expect(tailNodes(size, { x: -120, y: 50 })?.first).toMatchObject({ x: 0 });
    expect(tailNodes(size, { x: 100, y: 220 })?.first).toMatchObject({
      y: 100,
    });
    expect(tailNodes(size, { x: 100, y: -120 })?.first).toMatchObject({ y: 0 });
  });

  it("straddles the crossing with a base of a usable width", () => {
    const nodes = tailNodes(size, { x: 320, y: 50 });

    expect(nodes?.first).toEqual({ x: 200, y: 39 });
    expect(nodes?.second).toEqual({ x: 200, y: 61 });
  });

  it("keeps the base clear of the rounded corners", () => {
    const nodes = tailNodes(size, { x: 500, y: -146 });

    expect(nodes?.edge).toBe("right");
    expect(nodes?.first.y).toBeGreaterThanOrEqual(8);
  });

  it("draws nothing for a tip resting inside the shape", () => {
    expect(tailNodes(size, centreOf(size))).toBeNull();
    expect(tailNodes(size, { x: 150, y: 50 })).toBeNull();
    expect(tailNodes(size, null)).toBeNull();
  });

  it("draws nothing for a tip barely past the edge", () => {
    expect(tailNodes(size, { x: 203, y: 50 })).toBeNull();
  });
});

describe("bubblePath", () => {
  it("closes the outline whether or not it has a tail", () => {
    expect(bubblePath(size, null)).toMatch(/^M8,0.*Z$/);
    expect(bubblePath(size, { x: 320, y: 50 })).toMatch(/^M8,0.*Z$/);
  });

  it("reaches the tip exactly once, on the edge it belongs to", () => {
    const drawn = bubblePath(size, { x: 320, y: 50 });

    expect(drawn.match(/320,50/g)).toHaveLength(1);
  });

  it("carries the tip on whichever edge the reader dragged it past", () => {
    expect(bubblePath(size, { x: 100, y: 240 })).toContain("100,240");
    expect(bubblePath(size, { x: -60, y: 50 })).toContain("-60,50");
  });

  it("leaves a plain rounded rectangle when the tip is retracted", () => {
    expect(bubblePath(size, null)).toBe(
      "M8,0L192,0A8,8 0 0 1 200,8L200,92A8,8 0 0 1 192,100L8,100A8,8 0 0 1 0,92L0,8A8,8 0 0 1 8,0Z",
    );
  });

  it("shrinks the corner radius rather than overrunning a tiny box", () => {
    expect(bubblePath({ width: 10, height: 6 }, null)).toContain("A3,3");
  });
});
