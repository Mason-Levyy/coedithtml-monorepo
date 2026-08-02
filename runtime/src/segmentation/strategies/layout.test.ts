import { describe, expect, it } from "vitest";
import { segmentByLayout } from "./layout";

function withHeight(element: Element, height: number): Element {
  element.getBoundingClientRect = () => ({ height }) as unknown as DOMRect;
  return element;
}

function containerWithChildHeights(heights: number[]): Element {
  const container = document.createElement("div");
  heights.forEach((height, i) => {
    const child = document.createElement("div");
    child.textContent = `Child ${i}`;
    withHeight(child, height);
    container.appendChild(child);
  });
  return container;
}

describe("segmentByLayout", () => {
  it("groups children until the virtual 900px height is exceeded", () => {
    const container = containerWithChildHeights([400, 400, 400, 400]);

    const slides = segmentByLayout(container);

    expect(slides?.map((slide) => [slide.startChild, slide.endChild])).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it("gives a single child taller than 900px its own slide", () => {
    const container = containerWithChildHeights([1200, 300, 300]);

    const slides = segmentByLayout(container);

    expect(slides?.map((slide) => [slide.startChild, slide.endChild])).toEqual([
      [0, 0],
      [1, 2],
    ]);
  });

  it("returns null when everything fits inside a single 900px group", () => {
    const container = containerWithChildHeights([100, 100, 100]);

    expect(segmentByLayout(container)).toBeNull();
  });

  it("returns null for a container with no children", () => {
    const container = document.createElement("div");

    expect(segmentByLayout(container)).toBeNull();
  });
});
