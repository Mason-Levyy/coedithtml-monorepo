const DEFAULT_DEBOUNCE_MS = 200;

export type StructuralChangeWatcher = {
  disconnect: () => void;
};

// Reports the change and nothing more. Segmenting here would run the strategies
// inside a timer callback, outside whatever error handling the caller wrapped
// its own work in, and a throw would escape as an unhandled page error.
export function watchForStructuralChange(
  container: Element,
  onStructuralChange: () => void,
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): StructuralChangeWatcher {
  let timer: ReturnType<typeof setTimeout> | undefined;

  // childList only, no subtree/attributes/characterData: text and attribute
  // edits must not retrigger segmentation, only structural changes do.
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(onStructuralChange, debounceMs);
  });
  observer.observe(container, { childList: true });

  return {
    disconnect: () => {
      clearTimeout(timer);
      observer.disconnect();
    },
  };
}
