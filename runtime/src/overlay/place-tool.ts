import {
  DEFAULT_MARK_COLOR,
  effectiveEdge,
  effectiveFill,
  nearestPreset,
  normalizeHex,
  type Anchor,
  type MarkTool,
} from "@coedithtml/protocol";
import { regionAnchorAtPoint } from "../dom/anchor-dom";

export type PlaceTool = {
  arm(tool: MarkTool | null, color?: string | null): void;
  resolve(x: number, y: number): Anchor | null;
  stop(): void;
};

function previewPaint(color: string | null): { fill: string; edge: string } {
  const hex = color === null ? null : normalizeHex(color);
  const painted =
    hex === null
      ? { color: DEFAULT_MARK_COLOR, fill: null }
      : { color: nearestPreset(hex), fill: hex };
  return { fill: effectiveFill(painted), edge: effectiveEdge(painted) };
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function startPlaceTool(options: {
  revision: string;
  onPlace(
    anchor: Anchor,
    size?: { width: number; height: number } | null,
  ): void;
  onCancel(): void;
}): PlaceTool {
  let armed: MarkTool | null = null;
  let armedColor: string | null = null;
  let borrowedCursor: string | null = null;
  let placedInPointerDown = false;

  function showCursor(wanted: boolean): void {
    if (wanted) {
      borrowedCursor ??= document.body.style.cursor;
      document.body.style.cursor = "crosshair";
      return;
    }
    if (borrowedCursor !== null) {
      document.body.style.cursor = borrowedCursor;
      borrowedCursor = null;
    }
  }

  function resolve(x: number, y: number): Anchor | null {
    return regionAnchorAtPoint(x, y, options.revision);
  }

  function disarm(): void {
    armed = null;
    showCursor(false);
  }

  function onPointerDown(event: PointerEvent): void {
    if (armed === null || event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    placedInPointerDown = false;
    const startX = event.clientX;
    const startY = event.clientY;
    const anchor = resolve(startX, startY);
    if (anchor === null) {
      return;
    }

    const paint = previewPaint(armedColor);
    const preview = document.createElement("div");
    preview.style.cssText = `position:fixed;z-index:99999;border:2px dashed ${paint.edge};background:${withAlpha(paint.fill, 0.35)};border-radius:8px;pointer-events:none;left:${startX}px;top:${startY}px;width:0px;height:0px;`;
    document.body.appendChild(preview);

    function onPointerMove(moveEvent: PointerEvent): void {
      const currentX = moveEvent.clientX;
      const currentY = moveEvent.clientY;
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      preview.style.left = `${left}px`;
      preview.style.top = `${top}px`;
      preview.style.width = `${width}px`;
      preview.style.height = `${height}px`;
    }

    function onPointerUp(upEvent: PointerEvent): void {
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      preview.remove();

      const endX = upEvent.clientX;
      const endY = upEvent.clientY;
      const dragDist = Math.hypot(endX - startX, endY - startY);

      let size: { width: number; height: number } | null = null;
      if (dragDist >= 8) {
        size = {
          width: Math.max(120, Math.abs(endX - startX)),
          height: Math.max(80, Math.abs(endY - startY)),
        };
      }
      placedInPointerDown = true;
      disarm();
      if (anchor !== null) {
        options.onPlace(anchor, size);
      }
    }

    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
  }

  function onClick(event: MouseEvent): void {
    if (armed === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (placedInPointerDown) {
      placedInPointerDown = false;
      return;
    }
    const anchor = resolve(event.clientX, event.clientY);
    if (anchor === null) {
      return;
    }
    disarm();
    options.onPlace(anchor, null);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (armed === null || event.key !== "Escape") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    disarm();
    options.onCancel();
  }

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);

  return {
    arm: (tool, color = null) => {
      armed = tool;
      armedColor = color;
      showCursor(tool !== null);
    },
    resolve,
    stop: () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      showCursor(false);
    },
  };
}
