import { describe, expect, it, vi } from "vitest";
import { regionAnchor, type TextAnchor } from "@coedithtml/protocol";
import { anchorFromRange } from "../dom/anchor-dom";
import { pathToElement } from "../dom/element-path";
import { elementById } from "../dom/test-dom";
import {
  buildTextIndex,
  rangeForOffsets,
  type TextIndex,
} from "../dom/text-index";
import { isOnScreen, locateAnchor, rectsForAnchor } from "./geometry";

const REVISION = "rev-1";

function render(html: string): TextIndex {
  document.body.innerHTML = html;
  return buildTextIndex(document.body);
}

function anchorOnQuote(index: TextIndex, quote: string): TextAnchor {
  const start = index.text.indexOf(quote);
  const range = rangeForOffsets(index, start, start + quote.length);
  if (range === null) {
    throw new Error("could not build a range for the quote");
  }
  const anchor = anchorFromRange(index, range, REVISION);
  if (anchor === null) {
    throw new Error("could not build an anchor for the range");
  }
  return anchor;
}

describe("geometry locateAnchor and rectsForAnchor", () => {
  it("determines if a rect is on screen", () => {
    expect(isOnScreen({ x: 10, y: 10, width: 100, height: 100 })).toBe(true);
    expect(
      isOnScreen({
        x: -500,
        y: 10,
        width: 100,
        height: 100,
      }),
    ).toBe(false);
  });

  it("locates a region anchor when visible and hides it when visibility is hidden or opacity 0", () => {
    const index = render(`
      <div id="deck">
        <div id="slide1" style="width: 400px; height: 300px;">
          <p id="target">Content on slide 1</p>
        </div>
      </div>
    `);

    const target = elementById("target");
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      left: 50,
      top: 50,
      width: 200,
      height: 40,
      right: 250,
      bottom: 90,
      x: 50,
      y: 50,
      toJSON: () => ({}),
    });

    const anchor = regionAnchor({
      path: pathToElement(target),
      fractionX: 0.5,
      fractionY: 0.5,
      revision: REVISION,
      excerpt: "Content",
    });
    if (anchor === null) {
      throw new Error("could not build a region anchor for the target");
    }

    const visibleLocated = locateAnchor(index, anchor);
    expect(visibleLocated).toEqual({
      at: { x: 150, y: 70 },
      onScreen: true,
    });

    // Inactive slide with visibility: hidden
    target.style.visibility = "hidden";
    expect(locateAnchor(index, anchor)).toEqual({
      at: null,
      why: "hidden",
    });

    // Slide with opacity: 0
    target.style.visibility = "visible";
    target.style.opacity = "0";
    expect(locateAnchor(index, anchor)).toEqual({
      at: null,
      why: "hidden",
    });

    // Ancestor with visibility: hidden
    target.style.opacity = "1";
    elementById("slide1").style.visibility = "hidden";
    expect(locateAnchor(index, anchor)).toEqual({
      at: null,
      why: "hidden",
    });
  });

  it("locates a text anchor when visible and hides it when container is hidden", () => {
    const index = render(`
      <div id="slide">
        <p id="para">Quote to comment on</p>
      </div>
    `);

    vi.spyOn(Range.prototype, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 100,
      width: 80,
      height: 20,
      right: 180,
      bottom: 120,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });
    vi.spyOn(Range.prototype, "getClientRects").mockReturnValue([
      {
        left: 100,
        top: 100,
        width: 80,
        height: 20,
        right: 180,
        bottom: 120,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect,
    ] as unknown as DOMRectList);

    const anchor = anchorOnQuote(index, "Quote");

    expect(locateAnchor(index, anchor)).toEqual({
      at: { x: 100, y: 100 },
      onScreen: true,
    });
    expect(rectsForAnchor(index, anchor)).toEqual([
      { x: 100, y: 100, width: 80, height: 20 },
    ]);

    // Inactive slide container with visibility: hidden
    elementById("slide").style.visibility = "hidden";

    expect(locateAnchor(index, anchor)).toEqual({
      at: null,
      why: "hidden",
    });
    expect(rectsForAnchor(index, anchor)).toEqual([]);
  });
});
