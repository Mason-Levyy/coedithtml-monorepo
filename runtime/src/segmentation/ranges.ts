import { deriveLabel } from "./label";
import type { Slide } from "./types";

export function slidesFromStartIndices(
  startIndices: number[],
  children: Element[],
): Slide[] {
  const sorted = [...new Set(startIndices)].sort((a, b) => a - b);
  return sorted.map((startChild, i) => {
    const nextStart = sorted[i + 1];
    const endChild =
      nextStart === undefined ? children.length - 1 : nextStart - 1;
    const range = children.slice(startChild, endChild + 1);
    return { index: i, startChild, endChild, label: deriveLabel(range, i) };
  });
}
