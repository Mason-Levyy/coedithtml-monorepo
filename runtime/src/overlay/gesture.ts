const DRAG_THRESHOLD = 3;

export type GestureUpdate = {
  dx: number;
  dy: number;
  x: number;
  y: number;
  shiftKey: boolean;
  moved: boolean;
};

export type GestureHandlers = {
  onUpdate(update: GestureUpdate): void;
  onCommit(update: GestureUpdate): void;
  onCancel(): void;
};

export type Gesture = {
  hasMoved(): boolean;
  end(): void;
};

function farEnough(dx: number, dy: number): boolean {
  return Math.abs(dx) >= DRAG_THRESHOLD || Math.abs(dy) >= DRAG_THRESHOLD;
}

export function beginGesture(
  event: PointerEvent,
  element: Element,
  handlers: GestureHandlers,
): Gesture | null {
  if (!event.isPrimary || event.button !== 0) {
    return null;
  }

  const startX = event.clientX;
  const startY = event.clientY;
  const pointerId = event.pointerId;
  let moved = false;
  let finished = false;
  let latest: GestureUpdate = {
    dx: 0,
    dy: 0,
    x: startX,
    y: startY,
    shiftKey: event.shiftKey,
    moved: false,
  };

  function detach(): void {
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", onPointerUp);
    element.removeEventListener("pointercancel", onAbort);
    element.removeEventListener("lostpointercapture", onAbort);
    window.removeEventListener("keydown", onKeyDown, true);
  }

  function finish(commit: GestureUpdate | null): void {
    if (finished) {
      return;
    }
    finished = true;
    detach();
    try {
      element.releasePointerCapture(pointerId);
    } catch {
      void 0;
    }
    try {
      if (commit === null) {
        handlers.onCancel();
      } else {
        handlers.onCommit(commit);
      }
    } catch (error) {
      console.error("[coedit] a gesture handler failed", error);
    }
  }

  function updateFrom(source: PointerEvent): GestureUpdate {
    const dx = source.clientX - startX;
    const dy = source.clientY - startY;
    moved ||= farEnough(dx, dy);
    return {
      dx,
      dy,
      x: source.clientX,
      y: source.clientY,
      shiftKey: source.shiftKey,
      moved,
    };
  }

  function onPointerMove(source: Event): void {
    if (!(source instanceof PointerEvent) || source.pointerId !== pointerId) {
      return;
    }
    latest = updateFrom(source);
    try {
      handlers.onUpdate(latest);
    } catch (error) {
      console.error("[coedit] a gesture handler failed", error);
      finish(null);
    }
  }

  function onPointerUp(source: Event): void {
    if (!(source instanceof PointerEvent) || source.pointerId !== pointerId) {
      return;
    }
    finish(updateFrom(source));
  }

  function onAbort(): void {
    finish(null);
  }

  function onKeyDown(source: KeyboardEvent): void {
    if (source.key === "Escape") {
      source.preventDefault();
      finish(null);
    }
  }

  try {
    element.setPointerCapture(pointerId);
  } catch {
    return null;
  }
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onAbort);
  element.addEventListener("lostpointercapture", onAbort);
  window.addEventListener("keydown", onKeyDown, true);

  return {
    hasMoved: () => latest.moved,
    end: () => finish(null),
  };
}
