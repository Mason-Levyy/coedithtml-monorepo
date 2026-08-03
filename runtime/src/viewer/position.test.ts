import { describe, expect, it } from "vitest";
import type { Slide } from "../segmentation/types";
import {
  anchorElementFor,
  resolveActiveIndexAfterResegmentation,
} from "./position";

function containerWithChildren(count: number): HTMLElement {
  const container = document.createElement("div");
  for (let i = 0; i < count; i += 1) {
    const child = document.createElement("div");
    child.textContent = `child-${i}`;
    container.appendChild(child);
  }
  return container;
}

describe("anchorElementFor", () => {
  it("returns the slide's start child", () => {
    const container = containerWithChildren(4);
    const slides: Slide[] = [
      { index: 0, startChild: 0, endChild: 1, label: "One" },
      { index: 1, startChild: 2, endChild: 3, label: "Two" },
    ];

    expect(anchorElementFor(container, slides, 1)).toBe(container.children[2]);
  });

  it("returns null for an unknown slide index", () => {
    const container = containerWithChildren(2);
    const slides: Slide[] = [
      { index: 0, startChild: 0, endChild: 1, label: "One" },
    ];

    expect(anchorElementFor(container, slides, 99)).toBeNull();
  });
});

describe("resolveActiveIndexAfterResegmentation", () => {
  it("follows the anchor element to its new slide when children are removed before it", () => {
    const container = containerWithChildren(6);
    const anchor = container.children[4];
    if (!anchor) throw new Error("expected an anchor element");

    container.children[0]?.remove();
    container.children[0]?.remove();

    const newSlides: Slide[] = [
      { index: 0, startChild: 0, endChild: 1, label: "One" },
      { index: 1, startChild: 2, endChild: 3, label: "Two" },
    ];

    expect(
      resolveActiveIndexAfterResegmentation(container, anchor, newSlides, 2),
    ).toBe(1);
  });

  it("falls back to a clamped numeric index when the anchor was removed", () => {
    const container = containerWithChildren(4);
    const anchor = container.children[3];
    if (!anchor) throw new Error("expected an anchor element");
    anchor.remove();

    const newSlides: Slide[] = [
      { index: 0, startChild: 0, endChild: 1, label: "One" },
    ];

    expect(
      resolveActiveIndexAfterResegmentation(container, anchor, newSlides, 3),
    ).toBe(0);
  });

  it("falls back to the clamped index when there is no anchor yet", () => {
    const container = containerWithChildren(2);
    const newSlides: Slide[] = [
      { index: 0, startChild: 0, endChild: 1, label: "One" },
    ];

    expect(
      resolveActiveIndexAfterResegmentation(container, null, newSlides, 5),
    ).toBe(0);
  });

  it("falls back to 0 when resegmentation leaves no slides at all", () => {
    const container = containerWithChildren(2);

    expect(resolveActiveIndexAfterResegmentation(container, null, [], 3)).toBe(
      0,
    );
  });
});
