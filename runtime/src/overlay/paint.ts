import type { OverlayEntry, StickyEntry } from "@coedithtml/protocol";
import type { TextIndex } from "../dom/text-index";
import { highlightElement } from "./elements";
import { rectsForAnchor } from "./geometry";
import type { OverlayLayer } from "./layer";
import type { StickyOverride, StickyView } from "./sticky-view";

export type PaintResult = { painted: string[]; orphaned: string[] };

export type ActivateMark = (markId: string) => void;

function isVisibleMark(mark: OverlayEntry): boolean {
  return mark.kind !== "reply" && mark.status === "open";
}

function isSticky(mark: OverlayEntry): mark is StickyEntry {
  return mark.kind === "sticky";
}

// Highlights are rebuilt wholesale because nothing drags one; stickies are not.
function paintHighlights(
  layer: OverlayLayer,
  index: TextIndex,
  marks: OverlayEntry[],
): { painted: string[]; orphaned: string[] } {
  layer.highlights.replaceChildren();
  const painted: string[] = [];
  const orphaned: string[] = [];

  for (const mark of marks) {
    const rects = rectsForAnchor(index, mark.anchor);
    for (const rect of rects) {
      layer.highlights.appendChild(highlightElement(mark, rect));
    }
    (rects.length > 0 ? painted : orphaned).push(mark.id);
  }
  return { painted, orphaned };
}

export function paintMarks(
  layer: OverlayLayer,
  view: StickyView,
  index: TextIndex,
  marks: OverlayEntry[],
  override: StickyOverride | null = null,
): PaintResult {
  const visible = marks.filter(isVisibleMark);
  const stickies = visible.filter(isSticky);
  const highlights = visible.filter((mark) => !isSticky(mark));

  const drawn = paintHighlights(layer, index, highlights);
  const strandedStickies = view.reconcile(index, stickies, override);

  const orphaned = [...drawn.orphaned, ...strandedStickies];
  const painted = [
    ...drawn.painted,
    ...stickies
      .map((mark) => mark.id)
      .filter((markId) => !orphaned.includes(markId)),
  ];
  return { painted, orphaned };
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
