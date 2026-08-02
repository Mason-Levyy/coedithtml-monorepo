import { slidesFromStartIndices } from "../ranges";
import type { Slide } from "../types";

const EXPLICIT_MARKER_SELECTOR = "[data-slide]";
const MIN_HITS = 2;

function indicesWhere(
  children: Element[],
  predicate: (child: Element) => boolean,
): number[] {
  return children
    .map((child, i) => (predicate(child) ? i : -1))
    .filter((i) => i !== -1);
}

export function segmentByMarkers(container: Element): Slide[] | null {
  const children = [...container.children];

  const markerIndices = indicesWhere(children, (child) =>
    child.matches(EXPLICIT_MARKER_SELECTOR),
  );
  if (markerIndices.length >= MIN_HITS) {
    return slidesFromStartIndices(markerIndices, children);
  }

  const sectionIndices = indicesWhere(
    children,
    (child) => child.tagName === "SECTION",
  );
  if (sectionIndices.length >= MIN_HITS) {
    return slidesFromStartIndices(sectionIndices, children);
  }

  return null;
}
