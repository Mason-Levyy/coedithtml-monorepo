import { describe, expect, it } from "vitest";
import {
  MARK_EDGE,
  MARK_FILL,
  deriveEdge,
  effectiveEdge,
  effectiveFill,
  nearestPreset,
  normalizeHex,
  textOn,
} from "./colors";
import { MARK_COLORS, type MarkColor } from "./overlay";

function channels(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function apart(a: string, b: string): number {
  const left = channels(a);
  const right = channels(b);
  return Math.max(
    ...left.map((value, at) => Math.abs(value - (right[at] ?? 0))),
  );
}

describe("normalizeHex", () => {
  it("accepts both hex lengths and settles on one casing", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("#FF00AA")).toBe("#ff00aa");
    expect(normalizeHex("  #ff00aa  ")).toBe("#ff00aa");
  });

  it("refuses anything a stylesheet would accept but we cannot parse", () => {
    expect(normalizeHex("red")).toBeNull();
    expect(normalizeHex("rgb(1,2,3)")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex(0xff00aa)).toBeNull();
    expect(normalizeHex(null)).toBeNull();
  });
});

describe("deriveEdge", () => {
  // The presets keep their hand-picked edges; a wheel colour has to look like them.
  it("lands close to the edge each preset was given by hand", () => {
    for (const color of MARK_COLORS) {
      expect(
        apart(deriveEdge(MARK_FILL[color]), MARK_EDGE[color]),
      ).toBeLessThan(45);
    }
  });

  it("stays visible against a fill at either extreme", () => {
    expect(apart(deriveEdge("#000000"), "#000000")).toBeGreaterThan(20);
    expect(apart(deriveEdge("#ffffff"), "#ffffff")).toBeGreaterThan(20);
  });
});

describe("textOn", () => {
  it("keeps ink dark on every preset", () => {
    for (const color of MARK_COLORS) {
      expect(textOn(MARK_FILL[color])).toBe("#17171a");
    }
  });

  it("flips to light ink once the fill goes dark", () => {
    expect(textOn("#0b1f4d")).toBe("#f5f5f5");
    expect(textOn("#000000")).toBe("#f5f5f5");
    expect(textOn("#ffffff")).toBe("#17171a");
  });
});

describe("nearestPreset", () => {
  it("answers each preset with itself", () => {
    for (const color of MARK_COLORS) {
      expect(nearestPreset(MARK_FILL[color])).toBe(color);
    }
  });

  it("matches on hue so a dark navy is not called green", () => {
    expect(nearestPreset("#0b1f4d")).toBe("blue");
    expect(nearestPreset("#7c3aed")).toBe("purple");
    expect(nearestPreset("#b45309")).toBe("orange");
  });

  it("falls back to the default when there is no hue to match", () => {
    expect(nearestPreset("#808080")).toBe("yellow");
  });
});

describe("effective paint", () => {
  const named = { color: "pink" as MarkColor, fill: null };
  const wheeled = { color: "pink" as MarkColor, fill: "#0b1f4d" };

  it("uses the hand-picked pair while no fill is chosen", () => {
    expect(effectiveFill(named)).toBe(MARK_FILL.pink);
    expect(effectiveEdge(named)).toBe(MARK_EDGE.pink);
  });

  it("derives the edge once a fill overrides the name", () => {
    expect(effectiveFill(wheeled)).toBe("#0b1f4d");
    expect(effectiveEdge(wheeled)).toBe(deriveEdge("#0b1f4d"));
  });
});
