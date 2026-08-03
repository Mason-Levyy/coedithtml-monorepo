const STICKY_OR_FIXED = new Set(["sticky", "fixed"]);

// Every getComputedStyle call forces the artifact to flush style, and this runs
// again on every re-segmentation. A long document would spend hundreds of
// milliseconds of its own main thread answering a question that is only used to
// decide whether to show one warning, so the walk stops early.
const MAX_ELEMENTS_EXAMINED = 2000;

export function hasStickyOrFixedPositioning(container: Element): boolean {
  if (STICKY_OR_FIXED.has(getComputedStyle(container).position)) {
    return true;
  }
  let examined = 0;
  for (const element of container.querySelectorAll("*")) {
    if (examined >= MAX_ELEMENTS_EXAMINED) {
      break;
    }
    examined += 1;
    if (STICKY_OR_FIXED.has(getComputedStyle(element).position)) {
      return true;
    }
  }
  return false;
}
