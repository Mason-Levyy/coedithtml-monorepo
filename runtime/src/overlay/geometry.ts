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

export function tailBase(box: Rect, target: Point): Point {
  const centreX = box.x + box.width / 2;
  const centreY = box.y + box.height / 2;
  const towardsX = target.x - centreX;
  const towardsY = target.y - centreY;
  if (towardsX === 0 && towardsY === 0) {
    return { x: centreX, y: centreY };
  }
  const reachX = towardsX === 0 ? Infinity : box.width / 2 / Math.abs(towardsX);
  const reachY =
    towardsY === 0 ? Infinity : box.height / 2 / Math.abs(towardsY);
  const reach = Math.min(reachX, reachY);
  return { x: centreX + towardsX * reach, y: centreY + towardsY * reach };
}

const TAIL_WIDTH = 14;

export function tailPoints(box: Rect, target: Point): string | null {
  const base = tailBase(box, target);
  const runX = target.x - base.x;
  const runY = target.y - base.y;
  const length = Math.hypot(runX, runY);
  if (length < 1) {
    return null;
  }
  const spreadX = (-runY / length) * (TAIL_WIDTH / 2);
  const spreadY = (runX / length) * (TAIL_WIDTH / 2);
  return (
    `${base.x - spreadX},${base.y - spreadY} ` +
    `${base.x + spreadX},${base.y + spreadY} ` +
    `${target.x},${target.y}`
  );
}
