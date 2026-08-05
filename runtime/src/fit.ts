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

function currentFit(): { mode: FitMode; contentHeight: number } {
  const root = document.documentElement;
  const mode: FitMode =
    hidesItsOwnOverflow(root) || hidesItsOwnOverflow(document.body)
      ? "scrolls-itself"
      : "grows-to-content";
  return { mode, contentHeight: root.scrollHeight };
}

export function reportFit(): () => void {
  let lastHeight = Number.NaN;
  let pending = 0;

  function publish(force: boolean): void {
    const { mode, contentHeight } = currentFit();
    // A frame sized to a pre-layout zero can never measure anything but zero again.
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

  // Forced: a listener attached after load missed the send, and dedupe suppresses a resend.
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
