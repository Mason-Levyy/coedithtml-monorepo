import { describe, expect, it } from "vitest";
import { slidesFromStartIndices } from "./ranges";

function childrenFromHtml(html: string): Element[] {
  const container = document.createElement("div");
  container.innerHTML = html;
  return [...container.children];
}

describe("slidesFromStartIndices", () => {
  it("builds contiguous ranges ending right before the next start index", () => {
    const children = childrenFromHtml(
      "<h1>A</h1><p>1</p><h1>B</h1><p>2</p><p>3</p>",
    );

    const slides = slidesFromStartIndices([0, 2], children);

    expect(slides).toEqual([
      { index: 0, startChild: 0, endChild: 1, label: "A" },
      { index: 1, startChild: 2, endChild: 4, label: "B" },
    ]);
  });

  it("sorts unsorted start indices", () => {
    const children = childrenFromHtml("<h1>A</h1><h1>B</h1><h1>C</h1>");

    const slides = slidesFromStartIndices([2, 0, 1], children);

    expect(slides.map((slide) => slide.startChild)).toEqual([0, 1, 2]);
  });

  it("deduplicates repeated start indices", () => {
    const children = childrenFromHtml("<h1>A</h1><h1>B</h1>");

    const slides = slidesFromStartIndices([0, 0, 1], children);

    expect(slides).toHaveLength(2);
  });

  it("extends the last slide to the end of the children list", () => {
    const children = childrenFromHtml("<h1>A</h1><p>1</p><p>2</p><p>3</p>");

    const slides = slidesFromStartIndices([0], children);

    expect(slides).toEqual([
      { index: 0, startChild: 0, endChild: 3, label: "A" },
    ]);
  });
});
