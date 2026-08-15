import {
  effectiveFill,
  type OverlayEntry,
  type StickyEntry,
} from "@coedithtml/protocol";
import { OVERLAY_HOST_ATTRIBUTE } from "../dom/constants";
import type { TextIndex } from "../dom/text-index";
import { isOnScreen, rectsForAnchor, type Rect } from "./geometry";
import type { OverlayLayer } from "./layer";
import type { StickyOverride, StickyView } from "./sticky-controller";

export type Placement = {
  offscreen: string[];
  hidden: string[];
  orphaned: string[];
};

export type ActivateMark = (markId: string) => void;

export function emptyPlacement(): Placement {
  return { offscreen: [], hidden: [], orphaned: [] };
}

function mergePlacement(into: Placement, from: Placement): Placement {
  return {
    offscreen: [...into.offscreen, ...from.offscreen],
    hidden: [...into.hidden, ...from.hidden],
    orphaned: [...into.orphaned, ...from.orphaned],
  };
}

function isVisibleMark(mark: OverlayEntry): boolean {
  return mark.kind !== "reply" && mark.status === "open";
}

function isSticky(mark: OverlayEntry): mark is StickyEntry {
  return mark.kind === "sticky";
}

function highlightElement(mark: OverlayEntry, rect: Rect): HTMLElement {
  const element = document.createElement("div");
  element.className = "highlight";
  element.dataset.mark = mark.id;
  element.style.background = effectiveFill(mark);
  element.style.left = `${rect.x}px`;
  element.style.top = `${rect.y}px`;
  element.style.width = `${rect.width}px`;
  element.style.height = `${rect.height}px`;
  return element;
}

function paintHighlights(
  layer: OverlayLayer,
  index: TextIndex,
  marks: OverlayEntry[],
): Placement {
  layer.highlights.replaceChildren();
  const placement = emptyPlacement();

  for (const mark of marks) {
    const rects = rectsForAnchor(index, mark.anchor);
    if (rects === null) {
      placement.orphaned.push(mark.id);
      continue;
    }
    if (rects.length === 0) {
      placement.hidden.push(mark.id);
      continue;
    }
    for (const rect of rects) {
      layer.highlights.appendChild(highlightElement(mark, rect));
    }
    if (!rects.some(isOnScreen)) {
      placement.offscreen.push(mark.id);
    }
  }
  return placement;
}

export function paintMarks(
  layer: OverlayLayer,
  view: StickyView,
  index: TextIndex,
  marks: OverlayEntry[],
  override: StickyOverride | null = null,
): Placement {
  const open = marks.filter(isVisibleMark);
  const stickies = open.filter(isSticky);
  const highlights = open.filter((mark) => !isSticky(mark));

  return mergePlacement(
    paintHighlights(layer, index, highlights),
    view.reconcile(index, stickies, override),
  );
}

function coversPoint(element: Element, x: number, y: number): boolean {
  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

// A highlight takes no pointer events, so the words underneath stay
// selectable, double-clickable, and clickable by the artifact's own handlers.
// The reader still gets to open the thread by clicking it, which means asking
// the painted rectangles where the click landed rather than being told.
function highlightUnder(
  layer: OverlayLayer,
  x: number,
  y: number,
): string | null {
  const painted = layer.highlights.children;
  for (let index = painted.length - 1; index >= 0; index -= 1) {
    const element = painted[index];
    if (element instanceof HTMLElement && coversPoint(element, x, y)) {
      return element.dataset.mark ?? null;
    }
  }
  return null;
}

export function onMarkActivated(
  layer: OverlayLayer,
  onActivate: ActivateMark,
): () => void {
  function handleStickyClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const markId = target.closest<HTMLElement>("[data-mark]")?.dataset.mark;
    if (markId !== undefined) {
      onActivate(markId);
    }
  }

  function handleDocumentClick(event: Event): void {
    if (!(event instanceof MouseEvent) || !(event.target instanceof Element)) {
      return;
    }
    if (event.target.closest(`[${OVERLAY_HOST_ATTRIBUTE}]`) !== null) {
      return;
    }
    const markId = highlightUnder(layer, event.clientX, event.clientY);
    if (markId !== null) {
      onActivate(markId);
    }
  }

  layer.stickies.addEventListener("click", handleStickyClick);
  document.addEventListener("click", handleDocumentClick, true);
  return () => {
    layer.stickies.removeEventListener("click", handleStickyClick);
    document.removeEventListener("click", handleDocumentClick, true);
  };
}
