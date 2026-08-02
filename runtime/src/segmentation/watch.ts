import { segmentWithProfile } from "./segment";
import type { SegmentResult } from "./types";

const DEFAULT_DEBOUNCE_MS = 200;

export type ResegmentWatcher = {
  disconnect: () => void;
};

export function watchForResegmentation(
  container: Element,
  onResegment: (result: SegmentResult) => void,
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): ResegmentWatcher {
  let timer: ReturnType<typeof setTimeout> | undefined;

  // childList only, no subtree/attributes/characterData: text and attribute
  // edits must not retrigger segmentation, only structural changes do.
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      onResegment(segmentWithProfile(container));
    }, debounceMs);
  });
  observer.observe(container, { childList: true });

  return {
    disconnect: () => {
      clearTimeout(timer);
      observer.disconnect();
    },
  };
}
