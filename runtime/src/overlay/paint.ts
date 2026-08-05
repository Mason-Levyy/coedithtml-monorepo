import type { OverlayEntry, StickyEntry } from "@coedithtml/protocol";
import type { TextIndex } from "../dom/text-index";
import { MARK_EDGE, MARK_FILL } from "./colors";
import {
  pointForAnchor,
  rectsForAnchor,
  tailPoints,
  type Point,
  type Rect,
} from "./geometry";
import type { OverlayLayer } from "./layer";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export type PaintResult = { painted: string[]; orphaned: string[] };

export type ActivateMark = (markId: string) => void;

function isVisibleMark(mark: OverlayEntry): boolean {
  return mark.kind !== "reply" && mark.status === "open";
}

function place(element: HTMLElement, rect: Rect): void {
  element.style.left = `${rect.x}px`;
  element.style.top = `${rect.y}px`;
  element.style.width = `${rect.width}px`;
  element.style.height = `${rect.height}px`;
}

function highlightElement(mark: OverlayEntry, rect: Rect): HTMLElement {
  const element = document.createElement("div");
  element.className = "highlight";
  element.dataset.mark = mark.id;
  element.style.background = MARK_FILL[mark.color];
  place(element, rect);
  return element;
}

function stickyElement(mark: StickyEntry, at: Point): HTMLElement {
  const element = document.createElement("div");
  element.className = "sticky";
  element.dataset.mark = mark.id;
  element.style.left = `${at.x + mark.offsetX}px`;
  element.style.top = `${at.y + mark.offsetY}px`;
  element.style.background = MARK_FILL[mark.color];
  element.style.borderColor = MARK_EDGE[mark.color];
  element.textContent = mark.body;

  const author = document.createElement("span");
  author.className = "author";
  author.textContent = mark.author.displayName;
  element.appendChild(author);
  return element;
}

function tailElement(mark: StickyEntry, points: string): SVGPolygonElement {
  const polygon = document.createElementNS(SVG_NAMESPACE, "polygon");
  polygon.setAttribute("points", points);
  polygon.setAttribute("fill", MARK_FILL[mark.color]);
  polygon.setAttribute("stroke", MARK_EDGE[mark.color]);
  polygon.dataset.mark = mark.id;
  return polygon;
}

function boxOf(element: HTMLElement): Rect {
  const box = element.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
}

function paintSticky(
  layer: OverlayLayer,
  index: TextIndex,
  mark: StickyEntry,
): boolean {
  const at = pointForAnchor(index, mark.anchor);
  if (at === null) {
    return false;
  }
  const element = stickyElement(mark, at);
  layer.surface.appendChild(element);

  if (mark.tail === null) {
    return true;
  }
  const target = pointForAnchor(index, mark.tail);
  const points = target === null ? null : tailPoints(boxOf(element), target);
  if (points !== null) {
    layer.tails.appendChild(tailElement(mark, points));
  }
  return true;
}

function paintComment(
  layer: OverlayLayer,
  index: TextIndex,
  mark: OverlayEntry,
): boolean {
  const rects = rectsForAnchor(index, mark.anchor);
  for (const rect of rects) {
    layer.surface.appendChild(highlightElement(mark, rect));
  }
  return rects.length > 0;
}

export function paintMarks(
  layer: OverlayLayer,
  index: TextIndex,
  marks: OverlayEntry[],
): PaintResult {
  layer.surface.replaceChildren();
  layer.tails.replaceChildren();

  const painted: string[] = [];
  const orphaned: string[] = [];

  for (const mark of marks) {
    if (!isVisibleMark(mark)) {
      continue;
    }
    const drawn =
      mark.kind === "sticky"
        ? paintSticky(layer, index, mark)
        : paintComment(layer, index, mark);
    (drawn ? painted : orphaned).push(mark.id);
  }

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

  layer.surface.addEventListener("click", handleClick);
  return () => layer.surface.removeEventListener("click", handleClick);
}
