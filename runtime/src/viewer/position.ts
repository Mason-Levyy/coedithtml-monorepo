import type { Slide } from "../segmentation/types";

export function anchorElementFor(
  container: Element,
  slides: Slide[],
  activeIndex: number,
): Element | null {
  const slide = slides.find((candidate) => candidate.index === activeIndex);
  if (slide === undefined) {
    return null;
  }
  return container.children[slide.startChild] ?? null;
}

function findSlideIndexContainingChild(
  slides: Slide[],
  childIndex: number,
): number | null {
  const match = slides.find(
    (slide) => childIndex >= slide.startChild && childIndex <= slide.endChild,
  );
  return match?.index ?? null;
}

export function resolveActiveIndexAfterResegmentation(
  container: Element,
  anchorElement: Element | null,
  newSlides: Slide[],
  previousActiveIndex: number,
): number {
  if (anchorElement !== null) {
    const newChildIndex = [...container.children].indexOf(anchorElement);
    if (newChildIndex !== -1) {
      const matchedIndex = findSlideIndexContainingChild(
        newSlides,
        newChildIndex,
      );
      if (matchedIndex !== null) {
        return matchedIndex;
      }
    }
  }
  return Math.min(previousActiveIndex, Math.max(newSlides.length - 1, 0));
}
