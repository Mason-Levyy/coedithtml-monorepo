import type { Slide } from "../segmentation/types";

export function scrollToSlide(
  container: Element,
  slides: Slide[],
  index: number,
): void {
  const slide = slides.find((candidate) => candidate.index === index);
  if (!slide) {
    return;
  }
  const target = [...container.children][slide.startChild];
  target?.scrollIntoView({ block: "start" });
}
