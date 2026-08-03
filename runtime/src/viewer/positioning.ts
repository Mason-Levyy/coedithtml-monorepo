const STICKY_OR_FIXED = new Set(["sticky", "fixed"]);

export function hasStickyOrFixedPositioning(container: Element): boolean {
  if (STICKY_OR_FIXED.has(getComputedStyle(container).position)) {
    return true;
  }
  for (const element of container.querySelectorAll("*")) {
    if (STICKY_OR_FIXED.has(getComputedStyle(element).position)) {
      return true;
    }
  }
  return false;
}
