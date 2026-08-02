import { describe, expect, it } from "vitest";
import { segment } from "./segment";

function containerFromHtml(html: string): Element {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

describe("segment", () => {
  it("prefers explicit markers over semantic breaks", () => {
    const container = containerFromHtml(
      "<div data-slide><h1>A</h1></div><div data-slide><h1>B</h1></div><hr><h1>C</h1><hr><h1>D</h1>",
    );

    const slides = segment(container);

    expect(slides.map((slide) => slide.label)).toEqual(["A", "B"]);
  });

  it("falls through to semantic breaks when there are no explicit markers", () => {
    const container = containerFromHtml("<h1>A</h1><hr><h1>B</h1>");

    const slides = segment(container);

    expect(slides.map((slide) => slide.label)).toEqual(["A", "B"]);
  });

  it("falls through to the layout heuristic when nothing else is confident", () => {
    const container = containerFromHtml("<p>A</p><p>B</p><p>C</p><p>D</p>");
    const children = [...container.children];
    children.forEach((child) => {
      child.getBoundingClientRect = () =>
        ({ height: 400 }) as unknown as DOMRect;
    });

    const slides = segment(container);

    expect(slides.map((slide) => [slide.startChild, slide.endChild])).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it("falls all the way through to a single slide for an application-shaped artifact", () => {
    const container = containerFromHtml(
      "<canvas></canvas><button>Play</button>",
    );

    const slides = segment(container);

    expect(slides).toHaveLength(1);
    expect(slides[0]).toMatchObject({ startChild: 0, endChild: 1 });
  });

  it("returns an empty list rather than throwing for an empty container", () => {
    const container = document.createElement("div");

    expect(segment(container)).toEqual([]);
  });
});
