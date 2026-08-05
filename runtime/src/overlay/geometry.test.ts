import { describe, expect, it } from "vitest";
import { tailBase, tailPoints, type Rect } from "./geometry";

const box: Rect = { x: 100, y: 100, width: 200, height: 100 };

function pointsOf(text: string): { x: number; y: number }[] {
  return text.split(" ").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    return { x: x ?? 0, y: y ?? 0 };
  });
}

describe("tailBase", () => {
  it("leaves the box from the side facing the target", () => {
    expect(tailBase(box, { x: 600, y: 150 })).toEqual({ x: 300, y: 150 });
    expect(tailBase(box, { x: 0, y: 150 })).toEqual({ x: 100, y: 150 });
    expect(tailBase(box, { x: 200, y: 400 })).toEqual({ x: 200, y: 200 });
    expect(tailBase(box, { x: 200, y: 0 })).toEqual({ x: 200, y: 100 });
  });

  it("leaves through the corner when the target lies along the diagonal", () => {
    const base = tailBase(box, { x: 400, y: 250 });

    expect(base.x).toBeCloseTo(300);
    expect(base.y).toBeCloseTo(200);
  });

  it("leaves through the nearer edge, not the corner, off the diagonal", () => {
    const base = tailBase(box, { x: 400, y: 300 });

    expect(base.y).toBeCloseTo(200);
    expect(base.x).toBeLessThan(300);
  });

  it("collapses to the centre when the target is the centre", () => {
    expect(tailBase(box, { x: 200, y: 150 })).toEqual({ x: 200, y: 150 });
  });
});

describe("tailPoints", () => {
  it("draws a triangle from the box edge to the target", () => {
    const points = tailPoints(box, { x: 600, y: 150 });
    if (points === null) {
      throw new Error("expected a tail");
    }
    const drawn = pointsOf(points);

    expect(drawn).toHaveLength(3);
    expect(drawn[2]).toEqual({ x: 600, y: 150 });
    expect(drawn[0]?.x).toBeCloseTo(300);
    expect(drawn[1]?.x).toBeCloseTo(300);
    expect(Math.abs((drawn[0]?.y ?? 0) - (drawn[1]?.y ?? 0))).toBeCloseTo(14);
  });

  // This is the PowerPoint gesture: drag the tip back in and the pointer goes.
  it("draws nothing once the target sits inside the box", () => {
    expect(tailPoints(box, { x: 200, y: 150 })).toBeNull();
  });
});
