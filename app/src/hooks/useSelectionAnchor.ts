import { useEffect, useReducer, type RefObject } from "react";
import { pointOnPage, type ViewportPoint } from "@/lib/frame-geometry";
import type { ViewportRect } from "@/lib/protocol";

export function useSelectionAnchor(
  frame: RefObject<HTMLIFrameElement | null>,
  rect: ViewportRect | null,
): ViewportPoint | null {
  const [, remeasure] = useReducer((count: number) => count + 1, 0);

  // The rect is the frame's own; scrolling the page moves the frame out from under it.
  useEffect(() => {
    window.addEventListener("scroll", remeasure, true);
    window.addEventListener("resize", remeasure);
    return () => {
      window.removeEventListener("scroll", remeasure, true);
      window.removeEventListener("resize", remeasure);
    };
  }, []);

  if (rect === null) {
    return null;
  }
  return pointOnPage(frame.current, { x: rect.x, y: rect.y + rect.height });
}
