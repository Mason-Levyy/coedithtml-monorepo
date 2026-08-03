import type { Slide } from "../segmentation/types";

const SCROLL_SPY_THRESHOLD_PX = 32;
const DEFAULT_THROTTLE_MS = 150;

export function determineActiveSlide(
  container: Element,
  slides: Slide[],
): number {
  const children = [...container.children];
  let active = 0;
  for (const slide of slides) {
    const startEl = children[slide.startChild];
    if (!startEl) {
      continue;
    }
    if (startEl.getBoundingClientRect().top <= SCROLL_SPY_THRESHOLD_PX) {
      active = slide.index;
    } else {
      break;
    }
  }
  return active;
}

export type ScrollSpyWatcher = {
  disconnect: () => void;
};

export function watchScrollSpy(
  container: Element,
  getSlides: () => Slide[],
  onActiveSlideChange: (index: number) => void,
  throttleMs: number = DEFAULT_THROTTLE_MS,
): ScrollSpyWatcher {
  let lastActive: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;

  const check = () => {
    pending = false;
    try {
      const slides = getSlides();
      if (slides.length === 0) {
        return;
      }
      const active = determineActiveSlide(container, slides);
      if (active !== lastActive) {
        lastActive = active;
        onActiveSlideChange(active);
      }
    } catch (error) {
      console.error("[coedit] scroll-spy check failed", error);
    }
  };

  const handleScroll = () => {
    if (pending) {
      return;
    }
    pending = true;
    timer = setTimeout(check, throttleMs);
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  check();

  return {
    disconnect: () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    },
  };
}
