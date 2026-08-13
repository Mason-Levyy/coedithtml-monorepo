export type RepaintScheduler = {
  repaint(): void;
  reindex(): void;
  holdIndex(held: boolean): void;
  stop(): void;
};

const MUTATION_QUIET_MS = 100;

export function createRepaintScheduler(options: {
  onPaint: () => void;
  onReindex: () => void;
}): RepaintScheduler {
  let frame = 0;
  let mutationTimer = 0;
  let needsReindex = false;
  let indexHeld = false;

  function schedule(reindex: boolean): void {
    needsReindex ||= reindex;
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      if (needsReindex && !indexHeld) {
        needsReindex = false;
        options.onReindex();
      }
      options.onPaint();
    });
  }

  const repaint = (): void => schedule(false);
  const reindex = (): void => schedule(true);

  function onMutation(): void {
    window.clearTimeout(mutationTimer);
    mutationTimer = window.setTimeout(reindex, MUTATION_QUIET_MS);
  }

  const observer = new MutationObserver(onMutation);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  window.addEventListener("scroll", repaint, true);
  window.addEventListener("resize", repaint);

  return {
    repaint,
    reindex,
    holdIndex: (held) => {
      indexHeld = held;
      if (!held && needsReindex) {
        reindex();
      }
    },
    stop: () => {
      observer.disconnect();
      window.removeEventListener("scroll", repaint, true);
      window.removeEventListener("resize", repaint);
      window.clearTimeout(mutationTimer);
      window.cancelAnimationFrame(frame);
    },
  };
}
