export function isElementVisible(element: Element | null): boolean {
  if (!element || !element.isConnected) {
    return false;
  }

  if (typeof element.checkVisibility === "function") {
    if (
      !element.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
        contentVisibilityAuto: true,
      })
    ) {
      return false;
    }
  }

  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      parseFloat(style.opacity || "1") === 0
    ) {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}
