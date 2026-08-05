import {
  markActivatedMessage,
  orphansMessage,
  placementMessage,
  selectionMessage,
  type MarkTool,
  type OverlayEntry,
} from "@coedithtml/protocol";
import { resolveRevision } from "./config";
import { anchorFromRange, regionAnchorAtPoint } from "./dom/anchor-dom";
import { buildTextIndex, type TextIndex } from "./dom/text-index";
import { createOverlayLayer, type OverlayLayer } from "./overlay/layer";
import { onMarkActivated, paintMarks } from "./overlay/paint";
import { receiveFromApp, sendToApp } from "./transport/bridge";

export function startMarks(): () => void {
  const created = createOverlayLayer();
  if (created === null) {
    return () => {};
  }
  const layer: OverlayLayer = created;

  const revision = resolveRevision();
  let marks: OverlayEntry[] = [];
  let index: TextIndex = buildTextIndex(document.body);
  let paintFrame = 0;
  let selectionFrame = 0;

  let reportedOrphans = "";

  function paint(): void {
    try {
      const result = paintMarks(layer, index, marks);
      const orphans = result.orphaned.join(",");
      if (orphans !== reportedOrphans) {
        reportedOrphans = orphans;
        sendToApp(orphansMessage(result.orphaned));
      }
    } catch (error) {
      console.error("[coedit] failed to paint marks", error);
    }
  }

  function schedule(reindex: boolean): void {
    window.cancelAnimationFrame(paintFrame);
    paintFrame = window.requestAnimationFrame(() => {
      if (reindex) {
        index = buildTextIndex(document.body);
      }
      paint();
    });
  }

  const repaint = (): void => schedule(false);
  const reindex = (): void => schedule(true);

  function reportSelection(): void {
    const selection = document.getSelection();
    const range =
      selection === null || selection.isCollapsed || selection.rangeCount === 0
        ? null
        : selection.getRangeAt(0);
    const anchor =
      range === null ? null : anchorFromRange(index, range, revision);
    if (range === null || anchor === null) {
      sendToApp(selectionMessage(null, null));
      return;
    }
    const box = range.getBoundingClientRect();
    sendToApp(
      selectionMessage(anchor, {
        x: box.left,
        y: box.top,
        width: box.width,
        height: box.height,
      }),
    );
  }

  // Throttled: selectionchange fires on every mousemove of a drag.
  function scheduleSelection(): void {
    window.cancelAnimationFrame(selectionFrame);
    selectionFrame = window.requestAnimationFrame(reportSelection);
  }

  let armedTool: MarkTool | null = null;
  let borrowedCursor: string | null = null;

  // Restored to its old value, not cleared: the cursor is the artifact's to set.
  function armCursor(armed: boolean): void {
    if (armed) {
      borrowedCursor ??= document.body.style.cursor;
      document.body.style.cursor = "crosshair";
      return;
    }
    if (borrowedCursor !== null) {
      document.body.style.cursor = borrowedCursor;
      borrowedCursor = null;
    }
  }

  // Swallowed so the artifact's own handlers do not fire under the pointer.
  function placeOnClick(event: MouseEvent): void {
    if (armedTool === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const anchor = regionAnchorAtPoint(event.clientX, event.clientY, revision);
    if (anchor === null) {
      return;
    }
    armedTool = null;
    armCursor(false);
    sendToApp(placementMessage(anchor));
  }

  const stopActivation = onMarkActivated(layer, (markId) =>
    sendToApp(markActivatedMessage(markId)),
  );
  const stopReceiving = receiveFromApp((message) => {
    if (message.type === "set-tool") {
      armedTool = message.tool;
      armCursor(armedTool !== null);
      return;
    }
    marks = message.marks;
    repaint();
  });

  const observer = new MutationObserver(reindex);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  window.addEventListener("scroll", repaint, true);
  window.addEventListener("resize", repaint);
  document.addEventListener("selectionchange", scheduleSelection);
  document.addEventListener("click", placeOnClick, true);

  return () => {
    observer.disconnect();
    stopActivation();
    stopReceiving();
    window.removeEventListener("scroll", repaint, true);
    window.removeEventListener("resize", repaint);
    document.removeEventListener("selectionchange", scheduleSelection);
    document.removeEventListener("click", placeOnClick, true);
    armCursor(false);
    window.cancelAnimationFrame(paintFrame);
    window.cancelAnimationFrame(selectionFrame);
    layer.destroy();
  };
}
