import { slidesFromStartIndices } from "../ranges";
import type { Slide } from "../types";
import { estimateVirtualHeight } from "../virtual-height";

const VIRTUAL_HEIGHT = 900;
const MIN_HITS = 2;

export function segmentByLayout(container: Element): Slide[] | null {
  const children = [...container.children];
  if (children.length === 0) {
    return null;
  }

  const startIndices: number[] = [0];
  let accumulated = 0;

  children.forEach((child, i) => {
    const height = estimateVirtualHeight(child);
    if (i > 0 && accumulated + height > VIRTUAL_HEIGHT) {
      startIndices.push(i);
      accumulated = height;
    } else {
      accumulated += height;
    }
  });

  return startIndices.length >= MIN_HITS
    ? slidesFromStartIndices(startIndices, children)
    : null;
}
