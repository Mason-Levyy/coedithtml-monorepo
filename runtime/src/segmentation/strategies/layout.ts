import { slidesFromStartIndices } from "../ranges";
import type { Slide } from "../types";

const VIRTUAL_HEIGHT = 900;
const MIN_HITS = 2;

// Real getBoundingClientRect height, not the viewport: a phone and a laptop
// must land on the same slide boundaries for the same link.
function heightOf(element: Element): number {
  return element.getBoundingClientRect().height;
}

export function segmentByLayout(container: Element): Slide[] | null {
  const children = [...container.children];
  if (children.length === 0) {
    return null;
  }

  const startIndices: number[] = [0];
  let accumulated = 0;

  children.forEach((child, i) => {
    const height = heightOf(child);
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
