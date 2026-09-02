import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StickyEntry } from "@coedithtml/protocol";
import { pathToElement } from "../dom/element-path";
import { elementById } from "../dom/test-dom";
import { buildTextIndex, type TextIndex } from "../dom/text-index";
import { createOverlayLayer, type OverlayLayer } from "./layer";
import { createStickyView, type StickyView } from "./sticky-controller";

const REGION = {
  kind: "region" as const,
  path: "p[1]",
  fractionX: 0.5,
  fractionY: 0.5,
  revision: "r1",
};

function sticky(overrides: Partial<StickyEntry> = {}): StickyEntry {
  return {
    kind: "sticky",
    id: "s1",
    parentId: null,
    anchor: REGION,
    body: "Swap this chart",
    author: { id: "reader-1", displayName: "Sam", source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    createdAt: "2026-08-04T12:00:00.000Z",
    offsetX: 0,
    offsetY: 0,
    width: null,
    height: null,
    tail: null,
    textSize: "m",
    ...overrides,
  };
}

describe("the sticky view", () => {
  let layer: OverlayLayer;
  let view: StickyView;
  let index: TextIndex;

  beforeEach(() => {
    document.body.innerHTML = "<p>Revenue grew 18% this quarter.</p>";
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 50,
      width: 200,
      height: 100,
      right: 300,
      bottom: 150,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    });
    const created = createOverlayLayer();
    if (created === null) {
      throw new Error("no layer");
    }
    layer = created;
    view = createStickyView(layer);
    index = buildTextIndex(document.body);
  });

  it("keeps the same element across repaints of the same sticky", () => {
    view.reconcile(index, [sticky()], null);
    const first = view.elementFor("s1");
    view.reconcile(index, [sticky({ offsetX: 40 })], null);

    expect(view.elementFor("s1")).toBe(first);
    expect(first?.style.left).toBe("240px");
  });

  it("drops an element once its sticky is gone", () => {
    view.reconcile(index, [sticky()], null);
    const element = view.elementFor("s1");
    view.reconcile(index, [], null);

    expect(view.elementFor("s1")).toBeNull();
    expect(element?.isConnected).toBe(false);
  });

  it("reports a sticky whose anchor no longer resolves as orphaned", () => {
    document.body.innerHTML = "<div>The paragraph was replaced</div>";

    expect(view.reconcile(index, [sticky()], null)).toEqual({
      offscreen: [],
      hidden: [],
      orphaned: ["s1"],
    });
    expect(view.elementFor("s1")).toBeNull();
  });

  it("separates a sticky the artifact is not showing from one that is gone", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    expect(view.reconcile(index, [sticky()], null)).toEqual({
      offscreen: [],
      hidden: ["s1"],
      orphaned: [],
    });
    expect(view.elementFor("s1")).toBeNull();
  });

  it("reports a sticky scrolled past the viewport as offscreen, still painted", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: window.innerHeight + 500,
      width: 200,
      height: 100,
      right: 300,
      bottom: window.innerHeight + 600,
      x: 100,
      y: window.innerHeight + 500,
      toJSON: () => ({}),
    });

    expect(view.reconcile(index, [sticky()], null)).toEqual({
      offscreen: ["s1"],
      hidden: [],
      orphaned: [],
    });
    expect(view.elementFor("s1")).not.toBeNull();
  });

  it("prefers the override so a drag survives the room's own state", () => {
    view.reconcile(index, [sticky({ offsetX: 0 })], {
      markId: "s1",
      offsetX: 90,
      offsetY: 10,
      width: 300,
      height: 120,
      tailTip: null,
    });

    expect(view.elementFor("s1")?.style.left).toBe("290px");
    expect(view.elementFor("s1")?.style.width).toBe("300px");
  });

  it("leaves other stickies on their own geometry while one is dragged", () => {
    view.reconcile(index, [sticky(), sticky({ id: "s2", offsetX: 5 })], {
      markId: "s1",
      offsetX: 90,
      offsetY: 0,
      width: null,
      height: null,
      tailTip: null,
    });

    expect(view.elementFor("s2")?.style.left).toBe("205px");
  });

  function pathOf(markId: string): string {
    return (
      view.elementFor(markId)?.querySelector("path")?.getAttribute("d") ?? ""
    );
  }

  it("draws the tail into the sticky's own outline and retracts it", () => {
    view.reconcile(index, [sticky({ tail: { x: 320, y: 50 } })], null);
    const tailed = pathOf("s1");
    view.reconcile(index, [sticky({ tail: null })], null);

    expect(tailed).toContain("320,50");
    expect(pathOf("s1")).not.toContain("320,50");
    expect(pathOf("s1")).not.toBe("");
  });

  it("ignores a tip the reader dropped inside the box", () => {
    view.reconcile(index, [sticky({ tail: { x: 150, y: 50 } })], null);
    const spoutCurves = pathOf("s1").match(/Q/g) ?? [];

    expect(spoutCurves).toHaveLength(0);
  });

  it("rests the tip node just past the corner until a tail is given", () => {
    view.reconcile(index, [sticky()], null);
    const element = view.elementFor("s1");
    const tip = element?.querySelector<HTMLElement>('[data-node="tip"]');

    expect(tip?.style.left).toBe("216px");
    expect(tip?.style.top).toBe("116px");
    expect(
      element?.querySelector<HTMLElement>('[data-node="first"]')?.style.display,
    ).toBe("none");
  });

  it("colors the tip node to match the sticky's own colour", () => {
    view.reconcile(index, [sticky({ color: "purple", fill: null })], null);
    const element = view.elementFor("s1");
    const tip = element?.querySelector<HTMLElement>('[data-node="tip"]');

    expect(tip?.style.borderColor).toBe("#9b7ad6");
  });

  it("puts the tip node back on the point it was left at", () => {
    view.reconcile(index, [sticky({ tail: { x: 320, y: 50 } })], null);
    const element = view.elementFor("s1");

    expect(
      element?.querySelector<HTMLElement>('[data-node="tip"]')?.style.left,
    ).toBe("320px");
    expect(
      element?.querySelector<HTMLElement>('[data-node="first"]')?.style.display,
    ).toBe("");
  });

  it("holds the stored height as a floor the text can push past", () => {
    view.reconcile(index, [sticky({ width: 200, height: 100 })], null);
    const element = view.elementFor("s1");

    expect(element?.style.minHeight).toBe("100px");
    expect(element?.style.height).toBe("");
  });

  it("carries the text size the note was given", () => {
    view.reconcile(index, [sticky({ textSize: "xl" })], null);

    expect(view.elementFor("s1")?.dataset.size).toBe("xl");
  });

  it("writes the body without disturbing the handles", () => {
    view.reconcile(index, [sticky()], null);
    const element = view.elementFor("s1");
    const handles = element?.querySelectorAll(".handle").length;
    view.reconcile(index, [sticky({ body: "Rewritten" })], null);

    expect(element?.querySelector(".body")?.textContent).toBe("Rewritten");
    expect(element?.querySelectorAll(".handle").length).toBe(handles);
  });

  it("hides sticky on inactive slide when visibility is hidden and restores it when slide is active", () => {
    document.body.innerHTML = `
      <div id="deck">
        <div id="slide1" class="slide active"><p id="p1">Slide 1 text</p></div>
        <div id="slide2" class="slide" style="visibility: hidden;"><p id="p2">Slide 2 text</p></div>
      </div>
    `;
    const p1 = elementById("p1");
    const p2 = elementById("p2");
    const deckIndex = buildTextIndex(document.body);
    const sticky1 = sticky({
      id: "s1",
      anchor: {
        kind: "region",
        path: pathToElement(p1),
        fractionX: 0.5,
        fractionY: 0.5,
        revision: "r1",
      },
    });
    const sticky2 = sticky({
      id: "s2",
      anchor: {
        kind: "region",
        path: pathToElement(p2),
        fractionX: 0.5,
        fractionY: 0.5,
        revision: "r1",
      },
    });

    const placement1 = view.reconcile(deckIndex, [sticky1, sticky2], null);
    expect(placement1.hidden).toContain("s2");
    expect(view.elementFor("s1")).not.toBeNull();
    expect(view.elementFor("s2")).toBeNull();

    elementById("slide1").style.visibility = "hidden";
    elementById("slide2").style.visibility = "visible";

    const placement2 = view.reconcile(deckIndex, [sticky1, sticky2], null);
    expect(placement2.hidden).toContain("s1");
    expect(view.elementFor("s1")).toBeNull();
    expect(view.elementFor("s2")).not.toBeNull();
  });
});
