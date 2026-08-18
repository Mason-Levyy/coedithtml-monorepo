import type { Anchor } from "@coedithtml/protocol";
import { elementOf, rangeForTextAnchor } from "../dom/anchor-dom";
import { elementForPath } from "../dom/element-path";
import type { TextIndex } from "../dom/text-index";
import { isElementVisible } from "../dom/visibility";

export { isElementVisible } from "../dom/visibility";

export type Rect = { x: number; y: number; width: number; height: number };

export type Point = { x: number; y: number };

export type Unplaced = "hidden" | "orphaned";

export type Located =
  { at: Point; onScreen: boolean } | { at: null; why: Unplaced };

export function rectsForAnchor(
  index: TextIndex,
  anchor: Anchor,
): Rect[] | null {
  if (anchor.kind !== "text") {
    return null;
  }
  const range = rangeForTextAnchor(index, anchor);
  if (range === null) {
    return null;
  }
  const container = elementOf(range.commonAncestorContainer);
  if (container !== null && !isElementVisible(container)) {
    return [];
  }
  return Array.from(range.getClientRects())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => ({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    }));
}

export function isOnScreen(rect: Rect): boolean {
  return (
    rect.y + rect.height > 0 &&
    rect.y < window.innerHeight &&
    rect.x + rect.width > 0 &&
    rect.x < window.innerWidth
  );
}

function rectOf(box: DOMRect): Rect {
  return { x: box.left, y: box.top, width: box.width, height: box.height };
}

function isDrawn(box: DOMRect): boolean {
  return box.width > 0 && box.height > 0;
}

function locateRegion(anchor: Anchor & { kind: "region" }): Located {
  const element = elementForPath(anchor.path);
  if (element === null) {
    return { at: null, why: "orphaned" };
  }
  if (!isElementVisible(element)) {
    return { at: null, why: "hidden" };
  }
  const box = element.getBoundingClientRect();
  if (!isDrawn(box)) {
    return { at: null, why: "hidden" };
  }
  return {
    at: {
      x: box.left + box.width * anchor.fractionX,
      y: box.top + box.height * anchor.fractionY,
    },
    onScreen: isOnScreen(rectOf(box)),
  };
}

export function locateAnchor(index: TextIndex, anchor: Anchor): Located {
  if (anchor.kind === "region") {
    return locateRegion(anchor);
  }
  const range = rangeForTextAnchor(index, anchor);
  if (range === null) {
    return { at: null, why: "orphaned" };
  }
  const container = elementOf(range.commonAncestorContainer);
  if (container !== null && !isElementVisible(container)) {
    return { at: null, why: "hidden" };
  }
  const box = range.getBoundingClientRect();
  if (!isDrawn(box)) {
    return { at: null, why: "hidden" };
  }
  return { at: { x: box.left, y: box.top }, onScreen: isOnScreen(rectOf(box)) };
}
