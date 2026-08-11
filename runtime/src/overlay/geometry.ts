import type { Anchor } from "@coedithtml/protocol";
import { pointForRegionAnchor, rangeForTextAnchor } from "../dom/anchor-dom";
import type { TextIndex } from "../dom/text-index";

export type Rect = { x: number; y: number; width: number; height: number };

export type Point = { x: number; y: number };

export function rectsForAnchor(index: TextIndex, anchor: Anchor): Rect[] {
  if (anchor.kind !== "text") {
    return [];
  }
  const range = rangeForTextAnchor(index, anchor);
  if (range === null) {
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

export function pointForAnchor(index: TextIndex, anchor: Anchor): Point | null {
  if (anchor.kind === "region") {
    return pointForRegionAnchor(anchor);
  }
  const range = rangeForTextAnchor(index, anchor);
  if (range === null) {
    return null;
  }
  const box = range.getBoundingClientRect();
  return { x: box.left, y: box.top };
}
