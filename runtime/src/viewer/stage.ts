import type { Slide } from "../segmentation/types";

export type StageController = {
  setActiveSlide: (slides: Slide[], index: number | null) => void;
};

export function createStageController(container: Element): StageController {
  const originalDisplay = new WeakMap<HTMLElement, string>();

  function hide(element: HTMLElement): void {
    if (!originalDisplay.has(element)) {
      originalDisplay.set(element, element.style.display);
    }
    element.style.display = "none";
  }

  function restore(element: HTMLElement): void {
    const original = originalDisplay.get(element);
    if (original !== undefined) {
      element.style.display = original;
      originalDisplay.delete(element);
    }
  }

  return {
    setActiveSlide(slides: Slide[], index: number | null) {
      const children = [...container.children];
      const activeSlide =
        index === null ? null : slides.find((slide) => slide.index === index);

      children.forEach((child, i) => {
        if (!(child instanceof HTMLElement)) {
          return;
        }
        const inRange =
          activeSlide !== undefined &&
          activeSlide !== null &&
          i >= activeSlide.startChild &&
          i <= activeSlide.endChild;
        if (activeSlide === null || activeSlide === undefined || inRange) {
          restore(child);
        } else {
          hide(child);
        }
      });
    },
  };
}
