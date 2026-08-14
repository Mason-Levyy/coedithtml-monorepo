import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StickyEntry } from "@coedithtml/protocol";
import { buildTextIndex, type TextIndex } from "../dom/text-index";
import { createOverlayLayer, type OverlayLayer } from "./layer";
import {
  createStickyView,
  startStickyGestures,
  type StickyOverride,
  type StickyView,
} from "./sticky-controller";

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
    width: 200,
    height: 100,
    tail: null,
    ...overrides,
  };
}

describe("stickyGestures", () => {
  let layer: OverlayLayer;
  let view: StickyView;
  let index: TextIndex;
  let mark: StickyEntry;
  let overrides: StickyOverride | null;
  let patches: Record<string, unknown>[];
  let removed: string[];

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
    mark = sticky();
    overrides = null;
    patches = [];
    removed = [];

    view.reconcile(index, [mark], null);

    startStickyGestures({
      layer,
      view,
      markById: (id) => (id === mark.id ? mark : null),
      setOverride: (o) => {
        overrides = o;
      },
      onPatch: (id, patch) => {
        patches.push(patch);
      },
      onSelect: () => undefined,
      onEdit: () => undefined,
      onRemove: (id) => {
        removed.push(id);
      },
      canWrite: () => true,
    });
  });

  it("starts the tail drag from defaultTip when mark.tail is null", () => {
    const element = view.elementFor("s1");
    const tipNode = element?.querySelector<HTMLElement>('[data-node="tip"]');
    expect(tipNode).not.toBeNull();

    tipNode?.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 1,
        isPrimary: true,
        button: 0,
        clientX: 316,
        clientY: 166,
        bubbles: true,
        composed: true,
      }),
    );

    element?.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 1,
        clientX: 336,
        clientY: 186,
        bubbles: true,
      }),
    );

    expect(overrides?.tailTip).toEqual({ x: 236, y: 136 });

    element?.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId: 1,
        clientX: 336,
        clientY: 186,
        bubbles: true,
      }),
    );

    expect(patches).toEqual([{ tail: { x: 236, y: 136 } }]);
  });

  it("removes note when remove tool is clicked", () => {
    const element = view.elementFor("s1");
    const removeBtn = element?.querySelector<HTMLElement>(
      '[data-tool="remove"]',
    );
    expect(removeBtn).not.toBeNull();

    removeBtn?.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 1,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    expect(removed).toEqual(["s1"]);
  });

  it("resets sizing when fit tool is clicked", () => {
    const element = view.elementFor("s1");
    const fitBtn = element?.querySelector<HTMLElement>('[data-tool="fit"]');
    expect(fitBtn).not.toBeNull();

    fitBtn?.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 1,
        isPrimary: true,
        button: 0,
        bubbles: true,
        composed: true,
      }),
    );

    expect(patches).toEqual([{ width: null, height: null }]);
  });
});
