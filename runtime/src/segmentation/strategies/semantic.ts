import { deriveLabel } from "../label";
import { slidesFromStartIndices } from "../ranges";
import type { Slide } from "../types";

const HEADING_LEVELS = ["h1", "h2", "h3", "h4", "h5", "h6"];
const MIN_HEADING_OCCURRENCES = 3;

function depthFrom(element: Element, container: Element): number {
  let depth = 0;
  let node: Element | null = element;
  while (node && node !== container) {
    depth += 1;
    node = node.parentElement;
  }
  return depth;
}

function ownerChildIndex(element: Element, container: Element): number | null {
  let node: Element | null = element;
  while (node && node.parentElement !== container) {
    node = node.parentElement;
  }
  if (node === null) {
    return null;
  }
  return [...container.children].indexOf(node);
}

function segmentByHorizontalRules(container: Element): Slide[] | null {
  const children = [...container.children];
  const hrIndices = children
    .map((child, i) => (child.tagName === "HR" ? i : -1))
    .filter((i) => i !== -1);
  if (hrIndices.length === 0) {
    return null;
  }

  const slides: Slide[] = [];
  let start = 0;
  for (const hrIndex of hrIndices) {
    if (hrIndex > start) {
      const range = children.slice(start, hrIndex);
      slides.push({
        index: slides.length,
        startChild: start,
        endChild: hrIndex - 1,
        label: deriveLabel(range, slides.length),
      });
    }
    start = hrIndex + 1;
  }
  if (start < children.length) {
    const range = children.slice(start);
    slides.push({
      index: slides.length,
      startChild: start,
      endChild: children.length - 1,
      label: deriveLabel(range, slides.length),
    });
  }

  return slides.length >= 2 ? slides : null;
}

function segmentByHeadingLevel(
  container: Element,
  children: Element[],
  level: string,
): Slide[] | null {
  const headings = [...container.querySelectorAll(level)];
  const byDepth = new Map<number, Element[]>();
  for (const heading of headings) {
    const depth = depthFrom(heading, container);
    const group = byDepth.get(depth) ?? [];
    group.push(heading);
    byDepth.set(depth, group);
  }

  let bestGroup: Element[] = [];
  for (const group of byDepth.values()) {
    if (group.length > bestGroup.length) {
      bestGroup = group;
    }
  }
  if (bestGroup.length < MIN_HEADING_OCCURRENCES) {
    return null;
  }

  const indices = [
    ...new Set(
      bestGroup
        .map((heading) => ownerChildIndex(heading, container))
        .filter((index): index is number => index !== null),
    ),
  ];
  return indices.length >= 2 ? slidesFromStartIndices(indices, children) : null;
}

function segmentByHeadings(container: Element): Slide[] | null {
  const children = [...container.children];
  for (const level of HEADING_LEVELS) {
    const slides = segmentByHeadingLevel(container, children, level);
    if (slides) {
      return slides;
    }
  }
  return null;
}

export function segmentBySemanticBreaks(container: Element): Slide[] | null {
  return segmentByHorizontalRules(container) ?? segmentByHeadings(container);
}
