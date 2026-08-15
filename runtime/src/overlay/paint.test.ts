import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommentEntry } from "@coedithtml/protocol";
import { buildTextIndex, type TextIndex } from "../dom/text-index";
import { createOverlayLayer, type OverlayLayer } from "./layer";
import { onMarkActivated, paintMarks } from "./paint";
import { createStickyView, type StickyView } from "./sticky-controller";

const QUOTE = "Revenue grew 18%";

function comment(): CommentEntry {
  return {
    kind: "comment",
    id: "c1",
    parentId: null,
    anchor: {
      kind: "text",
      quote: QUOTE,
      prefix: "",
      suffix: " this quarter.",
      path: "p[1]",
      revision: "r1",
    },
    body: "Is this year over year?",
    author: { id: "reader-1", displayName: "Sam", source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    createdAt: "2026-08-04T12:00:00.000Z",
  };
}

function clickAt(x: number, y: number): void {
  document.querySelector("p")?.dispatchEvent(
    new MouseEvent("click", {
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe("a painted highlight", () => {
  let layer: OverlayLayer;
  let view: StickyView;
  let index: TextIndex;
  let activated: string[];
  let stop: () => void;

  beforeEach(() => {
    document.body.innerHTML = "<p>Revenue grew 18% this quarter.</p>";
    vi.spyOn(Range.prototype, "getClientRects").mockReturnValue([
      { left: 10, top: 20, width: 120, height: 18 },
    ] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 10,
      top: 20,
      width: 120,
      height: 18,
      right: 130,
      bottom: 38,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });

    const created = createOverlayLayer();
    if (created === null) {
      throw new Error("no layer");
    }
    layer = created;
    view = createStickyView(layer);
    index = buildTextIndex(document.body);
    activated = [];
    stop = onMarkActivated(layer, (markId) => activated.push(markId));
    paintMarks(layer, view, index, [comment()]);
  });

  afterEach(() => {
    stop();
    view.clear();
    layer.destroy();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("takes no pointer events, so the words underneath stay live", () => {
    const painted = layer.highlights.firstElementChild;

    expect(painted).not.toBeNull();
    expect(getComputedStyle(painted as Element).pointerEvents).toBe("none");
  });

  it("opens its thread when the reader clicks the words it covers", () => {
    clickAt(50, 25);

    expect(activated).toEqual(["c1"]);
  });

  it("stays quiet when the reader clicks elsewhere in the artifact", () => {
    clickAt(400, 400);

    expect(activated).toEqual([]);
  });
});
