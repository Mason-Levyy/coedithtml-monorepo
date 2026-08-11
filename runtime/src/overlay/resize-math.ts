import { clampStickySize } from "@coedithtml/protocol";
import type { ResizeEdge } from "./elements";
import type { Point, Rect } from "./geometry";

// -1 moves the left or top side, 1 the right or bottom, 0 leaves it fixed.
type Side = -1 | 0 | 1;

const HORIZONTAL: Record<ResizeEdge, Side> = {
  nw: -1,
  n: 0,
  ne: 1,
  e: 1,
  se: 1,
  s: 0,
  sw: -1,
  w: -1,
};

const VERTICAL: Record<ResizeEdge, Side> = {
  nw: -1,
  n: -1,
  ne: -1,
  e: 0,
  se: 1,
  s: 1,
  sw: 1,
  w: 0,
};

function lockedToAspect(
  start: Rect,
  width: number,
  height: number,
): { width: number; height: number } {
  if (start.width <= 0 || start.height <= 0) {
    return { width, height };
  }
  const ratio = start.height / start.width;
  const widerThanTaller =
    Math.abs(width - start.width) >= Math.abs(height - start.height);
  return widerThanTaller
    ? { width, height: width * ratio }
    : { width: height / ratio, height };
}

export function resizeRect(
  start: Rect,
  edge: ResizeEdge,
  delta: Point,
  lockAspect: boolean,
): Rect {
  const horizontal = HORIZONTAL[edge];
  const vertical = VERTICAL[edge];
  const pulled = {
    width: start.width + delta.x * horizontal,
    height: start.height + delta.y * vertical,
  };
  const shaped =
    lockAspect && horizontal !== 0 && vertical !== 0
      ? lockedToAspect(start, pulled.width, pulled.height)
      : pulled;

  const clamped = clampStickySize(shaped);
  const width = clamped.width ?? shaped.width;
  const height = clamped.height ?? shaped.height;

  // The side the reader is not dragging has to stay where they left it.
  return {
    x: horizontal === -1 ? start.x + start.width - width : start.x,
    y: vertical === -1 ? start.y + start.height - height : start.y,
    width,
    height,
  };
}

export function isInside(box: Rect, point: Point): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}
