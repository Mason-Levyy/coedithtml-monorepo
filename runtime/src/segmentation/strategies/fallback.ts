import { deriveLabel } from "../label";
import type { Slide } from "../types";

export function segmentAsSingleSlide(container: Element): Slide[] {
  const children = [...container.children];
  if (children.length === 0) {
    return [];
  }
  return [
    {
      index: 0,
      startChild: 0,
      endChild: children.length - 1,
      label: deriveLabel(children, 0),
    },
  ];
}
