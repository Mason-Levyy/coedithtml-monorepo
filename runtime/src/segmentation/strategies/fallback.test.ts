import { describe, expect, it } from "vitest";
import { segmentAsSingleSlide } from "./fallback";

function containerFromHtml(html: string): Element {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

describe("segmentAsSingleSlide", () => {
  it("always produces exactly one slide spanning every child", () => {
    const container = containerFromHtml(
      "<h1>App</h1><canvas></canvas><button>Go</button>",
    );

    const slides = segmentAsSingleSlide(container);

    expect(slides).toEqual([
      { index: 0, startChild: 0, endChild: 2, label: "App" },
    ]);
  });

  it("returns an empty list for a container with no children", () => {
    const container = document.createElement("div");

    expect(segmentAsSingleSlide(container)).toEqual([]);
  });
});
