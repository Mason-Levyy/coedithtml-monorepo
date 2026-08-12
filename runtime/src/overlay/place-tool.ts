import type { Anchor, MarkTool } from "@coedithtml/protocol";
import { regionAnchorAtPoint } from "../dom/anchor-dom";

export type PlaceTool = {
  arm(tool: MarkTool | null): void;
  resolve(x: number, y: number): Anchor | null;
  stop(): void;
};

export function startPlaceTool(options: {
  revision: string;
  onPlace(anchor: Anchor): void;
}): PlaceTool {
  let armed: MarkTool | null = null;
  let borrowedCursor: string | null = null;

  // Restored to its old value, not cleared: the cursor is the artifact's to set.
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

  // Swallowed so the artifact's own handlers do not fire under the pointer.
  function onClick(event: MouseEvent): void {
    if (armed === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const anchor = resolve(event.clientX, event.clientY);
    if (anchor === null) {
      return;
    }
    armed = null;
    showCursor(false);
    options.onPlace(anchor);
  }

  document.addEventListener("click", onClick, true);

  return {
    arm: (tool) => {
      armed = tool;
      showCursor(tool !== null);
    },
    resolve,
    stop: () => {
      document.removeEventListener("click", onClick, true);
      showCursor(false);
    },
  };
}
