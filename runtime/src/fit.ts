import { sendToApp } from "./transport/bridge";
import { fitMessage, type FitMode } from "./transport/messages";

const MIN_CHANGE_PX = 4;
const OVERFLOW_SLACK_PX = 2;

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

function bodyHeight(): number {
  const body = document.body;
  if (body === null) {
    return 0;
  }
  const style = window.getComputedStyle(body);
  return (
    body.scrollHeight + edgeOf(style.marginTop) + edgeOf(style.marginBottom)
  );
}

// The root element's scrollHeight can never come back smaller than the
// viewport, and in a frame that grows to content the viewport is the height the
// app set from the last report. Measuring the body instead breaks that circle:
// a frame left taller than what it holds would otherwise stay that way forever.
//
// Content the body does not carry — anything positioned against the document
// itself — is missing from that measurement, and a frame cut to it keeps a
// sliver of scroll the reader's wheel falls into instead of the page. A body
// caught short once is not asked again.
function measureContent(bodyLies: boolean): { height: number; lies: boolean } {
  const root = document.documentElement;
  const measured = bodyHeight();
  if (measured <= 0) {
    return { height: root.scrollHeight, lies: bodyLies };
  }
  const asked = root.clientHeight + OVERFLOW_SLACK_PX;
  const caughtShort = asked >= measured && root.scrollHeight > asked;
  const lies = bodyLies || caughtShort;
  return {
    height: lies ? root.scrollHeight : Math.min(root.scrollHeight, measured),
    lies,
  };
}

function currentFit(bodyLies: boolean): {
  mode: FitMode;
  contentHeight: number;
  lies: boolean;
} {
  const mode: FitMode =
    hidesItsOwnOverflow(document.documentElement) ||
    hidesItsOwnOverflow(document.body)
      ? "scrolls-itself"
      : "grows-to-content";
  const measured = measureContent(bodyLies);
  return { mode, contentHeight: measured.height, lies: measured.lies };
}

export function reportFit(): () => void {
  let lastHeight = Number.NaN;
  let pending = 0;
  let bodyLies = false;

  function publish(force: boolean): void {
    const { mode, contentHeight, lies } = currentFit(bodyLies);
    bodyLies = lies;
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
