import { sendToApp } from "./transport/bridge";
import { fitMessage, type FitMode } from "./transport/messages";

const MIN_CHANGE_PX = 4;

function hidesItsOwnOverflow(element: Element | null): boolean {
  if (element === null) {
    return false;
  }
  const overflowY = window.getComputedStyle(element).overflowY;
  return overflowY === "hidden" || overflowY === "clip";
}

function edgeOf(value: string): number {
  const pixels = Number.parseFloat(value);
  return Number.isFinite(pixels) ? pixels : 0;
}

// The root element's scrollHeight can never come back smaller than the
// viewport, and in a frame that grows to content the viewport is the height the
// app set from the last report. Measuring the body instead breaks that circle:
// a frame left taller than what it holds would otherwise stay that way forever.
function contentHeight(): number {
  const root = document.documentElement.scrollHeight;
  const body = document.body;
  if (body === null) {
    return root;
  }
  const style = window.getComputedStyle(body);
  const measured =
    body.scrollHeight + edgeOf(style.marginTop) + edgeOf(style.marginBottom);
  return measured > 0 ? Math.min(root, measured) : root;
}

function currentFit(): { mode: FitMode; contentHeight: number } {
  const mode: FitMode =
    hidesItsOwnOverflow(document.documentElement) ||
    hidesItsOwnOverflow(document.body)
      ? "scrolls-itself"
      : "grows-to-content";
  return { mode, contentHeight: contentHeight() };
}

export function reportFit(): () => void {
  let lastHeight = Number.NaN;
  let pending = 0;

  function publish(force: boolean): void {
    const { mode, contentHeight } = currentFit();
    if (contentHeight <= 0) {
      return;
    }
    if (!force && Math.abs(contentHeight - lastHeight) < MIN_CHANGE_PX) {
      return;
    }
    lastHeight = contentHeight;
    sendToApp(fitMessage(mode, contentHeight));
  }

  function schedule(): void {
    window.cancelAnimationFrame(pending);
    pending = window.requestAnimationFrame(() => publish(false));
  }

  function announce(): void {
    publish(true);
  }

  publish(false);
  schedule();

  const observer = new ResizeObserver(schedule);
  observer.observe(document.documentElement);
  if (document.body) {
    observer.observe(document.body);
  }
  window.addEventListener("load", announce);

  return () => {
    observer.disconnect();
    window.removeEventListener("load", announce);
    window.cancelAnimationFrame(pending);
  };
}
