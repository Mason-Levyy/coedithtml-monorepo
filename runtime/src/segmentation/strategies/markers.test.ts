import { describe, expect, it } from "vitest";
import { segmentByMarkers } from "./markers";

function containerFromHtml(html: string): Element {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

describe("segmentByMarkers", () => {
  it("segments on two or more [data-slide] elements", () => {
    const container = containerFromHtml(
      "<div data-slide><h1>One</h1></div><p>filler</p><div data-slide><h1>Two</h1></div>",
    );

    const slides = segmentByMarkers(container);

    expect(slides).toEqual([
      { index: 0, startChild: 0, endChild: 1, label: "One" },
      { index: 1, startChild: 2, endChild: 2, label: "Two" },
    ]);
  });

  it("segments on two or more top-level <section> elements", () => {
    const container = containerFromHtml(
      "<section><h1>One</h1></section><section><h1>Two</h1></section>",
    );

    const slides = segmentByMarkers(container);

    expect(slides?.map((slide) => slide.label)).toEqual(["One", "Two"]);
  });

  it("prefers [data-slide] over <section> when both are present", () => {
    const container = containerFromHtml(
      "<div data-slide><h1>A</h1></div><div data-slide><h1>B</h1></div><section><h1>C</h1></section>",
    );

    const slides = segmentByMarkers(container);

    expect(slides).toHaveLength(2);
    expect(slides?.map((slide) => slide.label)).toEqual(["A", "B"]);
  });

  it("does not treat a nested [data-slide] as a top-level hit", () => {
    const container = containerFromHtml(
      "<div><div data-slide><h1>Nested</h1></div></div>",
    );

    expect(segmentByMarkers(container)).toBeNull();
  });

  it("returns null with only a single marker", () => {
    const container = containerFromHtml(
      "<div data-slide><h1>Only one</h1></div><p>filler</p>",
    );

    expect(segmentByMarkers(container)).toBeNull();
  });

  it("returns null with no markers or sections at all", () => {
    const container = containerFromHtml("<p>Just a paragraph</p>");

    expect(segmentByMarkers(container)).toBeNull();
  });
});
