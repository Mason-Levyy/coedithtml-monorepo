import { describe, expect, it } from "vitest";
import { segmentByLayout } from "./layout";

// An <img height> is the one input the estimator takes at face value, which
// makes it the cleanest way to give a child a known virtual height.
function containerWithChildHeights(heights: number[]): Element {
  const container = document.createElement("div");
  heights.forEach((height) => {
    const child = document.createElement("div");
    const image = document.createElement("img");
    image.setAttribute("height", String(height));
    child.appendChild(image);
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

  // The reason the estimator exists: two readers on different devices have to
  // agree on what "slide 4" refers to, so a rendered height must not be an
  // input to the answer.
  it("ignores rendered geometry entirely", () => {
    const container = containerWithChildHeights([400, 400, 400, 400]);
    const asOnADesktop = segmentByLayout(container);

    for (const child of [...container.children]) {
      child.getBoundingClientRect = () =>
        ({ height: 4000 }) as unknown as DOMRect;
    }
    const asOnAPhone = segmentByLayout(container);

    expect(asOnAPhone).toEqual(asOnADesktop);
  });
});
