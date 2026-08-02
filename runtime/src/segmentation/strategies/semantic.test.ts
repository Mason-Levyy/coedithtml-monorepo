import { describe, expect, it } from "vitest";
import { segmentBySemanticBreaks } from "./semantic";

function containerFromHtml(html: string): Element {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

describe("segmentBySemanticBreaks", () => {
  it("splits on <hr> elements", () => {
    const container = containerFromHtml(
      "<h1>One</h1><p>a</p><hr><h1>Two</h1><p>b</p><hr><h1>Three</h1>",
    );

    const slides = segmentBySemanticBreaks(container);

    expect(slides?.map((slide) => slide.label)).toEqual([
      "One",
      "Two",
      "Three",
    ]);
  });

  it("drops a leading <hr> with nothing before it rather than emitting an empty slide", () => {
    const container = containerFromHtml("<hr><h1>One</h1><hr><h1>Two</h1>");

    const slides = segmentBySemanticBreaks(container);

    expect(slides?.map((slide) => slide.label)).toEqual(["One", "Two"]);
  });

  it("groups on the shallowest heading level with 3+ consistent-depth occurrences", () => {
    const container = containerFromHtml(
      "<div><h2>A</h2></div><div><h2>B</h2></div><div><h2>C</h2></div>",
    );

    const slides = segmentBySemanticBreaks(container);

    expect(slides?.map((slide) => slide.label)).toEqual(["A", "B", "C"]);
  });

  it("ignores headings that occur at an inconsistent depth", () => {
    const container = containerFromHtml(
      "<h2>Top level</h2><div><span><h2>Deeply nested</h2></span></div><h2>Another top level</h2>",
    );

    expect(segmentBySemanticBreaks(container)).toBeNull();
  });

  it("prefers a shallower qualifying heading level over a deeper one", () => {
    const container = containerFromHtml(
      `<div>
         <h1>Chapter A</h1>
         <h2>Section A.1</h2>
       </div>
       <div>
         <h1>Chapter B</h1>
         <h2>Section B.1</h2>
       </div>
       <div>
         <h1>Chapter C</h1>
         <h2>Section C.1</h2>
       </div>`,
    );

    const slides = segmentBySemanticBreaks(container);

    expect(slides?.map((slide) => slide.label)).toEqual([
      "Chapter A",
      "Chapter B",
      "Chapter C",
    ]);
  });

  it("returns null when there is no <hr> and no qualifying heading pattern", () => {
    const container = containerFromHtml(
      "<p>Just some text</p><h2>One heading</h2>",
    );

    expect(segmentBySemanticBreaks(container)).toBeNull();
  });
});
