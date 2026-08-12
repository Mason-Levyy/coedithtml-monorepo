import { useEffect, useRef, type RefObject } from "react";

export function useDismissOnOutside(
  open: boolean,
  dismiss: () => void,
): RefObject<HTMLDivElement | null> {
  const wrapper = useRef<HTMLDivElement>(null);
  const latest = useRef(dismiss);
  latest.current = dismiss;

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent): void {
      const target = event.target;
      if (target instanceof Node && !wrapper.current?.contains(target)) {
        latest.current();
      }
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        latest.current();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return wrapper;
}
