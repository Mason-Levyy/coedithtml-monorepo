import type { OverlayEntry, StickyEntry } from "@coedithtml/protocol";
import type { TextIndex } from "../dom/text-index";
import { highlightElement } from "./elements";
import { isOnScreen, rectsForAnchor } from "./geometry";
import type { OverlayLayer } from "./layer";
import type { StickyOverride, StickyView } from "./sticky-view";

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

export function onMarkActivated(
  layer: OverlayLayer,
  onActivate: ActivateMark,
): () => void {
  function handleClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const markId = target.closest<HTMLElement>("[data-mark]")?.dataset.mark;
    if (markId !== undefined) {
      onActivate(markId);
    }
  }

  layer.highlights.addEventListener("click", handleClick);
  layer.stickies.addEventListener("click", handleClick);
  return () => {
    layer.highlights.removeEventListener("click", handleClick);
    layer.stickies.removeEventListener("click", handleClick);
  };
}
