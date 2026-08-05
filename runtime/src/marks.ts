import {
  markActivatedMessage,
  selectionMessage,
  type OverlayEntry,
} from "@coedithtml/protocol";
import { resolveRevision } from "./config";
import { anchorFromRange } from "./dom/anchor-dom";
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

  function paint(): void {
    try {
      paintMarks(layer, index, marks);
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

  const stopActivation = onMarkActivated(layer, (markId) =>
    sendToApp(markActivatedMessage(markId)),
  );
  const stopReceiving = receiveFromApp((message) => {
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

  return () => {
    observer.disconnect();
    stopActivation();
    stopReceiving();
    window.removeEventListener("scroll", repaint, true);
    window.removeEventListener("resize", repaint);
    document.removeEventListener("selectionchange", scheduleSelection);
    window.cancelAnimationFrame(paintFrame);
    window.cancelAnimationFrame(selectionFrame);
    layer.destroy();
  };
}
