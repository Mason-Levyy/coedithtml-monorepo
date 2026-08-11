import {
  markActivatedMessage,
  orphansMessage,
  patchMarkMessage,
  placementMessage,
  selectionMessage,
  type MarkTool,
  type OverlayEntry,
  type StickyEntry,
} from "@coedithtml/protocol";
import { resolveRevision } from "./config";
import { anchorFromRange, regionAnchorAtPoint } from "./dom/anchor-dom";
import { buildTextIndex, type TextIndex } from "./dom/text-index";
import { createBodyEditor } from "./overlay/edit-body";
import { createOverlayLayer, type OverlayLayer } from "./overlay/layer";
import { onMarkActivated, paintMarks } from "./overlay/paint";
import { createRepaintScheduler } from "./overlay/scheduler";
import { startStickyGestures } from "./overlay/sticky-gestures";
import { createStickyView, type StickyOverride } from "./overlay/sticky-view";
import { receiveFromApp, sendToApp } from "./transport/bridge";

export function startMarks(): () => void {
  const created = createOverlayLayer();
  if (created === null) {
    return () => {};
  }
  const layer: OverlayLayer = created;
  const view = createStickyView(layer);

  const revision = resolveRevision();
  let marks: OverlayEntry[] = [];
  let index: TextIndex = buildTextIndex(document.body);
  let override: StickyOverride | null = null;
  let selectionFrame = 0;
  let reportedOrphans = "";

  function paint(): void {
    try {
      const result = paintMarks(layer, view, index, marks, override);
      const orphans = result.orphaned.join(",");
      if (orphans !== reportedOrphans) {
        reportedOrphans = orphans;
        sendToApp(orphansMessage(result.orphaned));
      }
    } catch (error) {
      console.error("[coedit] failed to paint marks", error);
    }
  }

  const scheduler = createRepaintScheduler({
    onPaint: paint,
    onReindex: () => {
      index = buildTextIndex(document.body);
    },
  });

  let canWrite = false;

  function stickyById(markId: string): StickyEntry | null {
    const found = marks.find((mark) => mark.id === markId);
    return found !== undefined && found.kind === "sticky" ? found : null;
  }

  const editor = createBodyEditor({
    onCommit: (markId, body) => sendToApp(patchMarkMessage(markId, { body })),
    onChanged: scheduler.repaint,
  });

  const gestures = startStickyGestures({
    layer,
    view,
    markById: stickyById,
    canWrite: () => canWrite,
    setOverride: (next) => {
      override = next;
      // Held only while a gesture runs: reindexing walks the whole document.
      scheduler.holdIndex(next !== null);
      scheduler.repaint();
    },
    onPatch: (markId, patch) => sendToApp(patchMarkMessage(markId, patch)),
    onSelect: (markId) => sendToApp(markActivatedMessage(markId)),
    onEdit: (element, markId, body) => editor.begin(element, markId, body),
  });

  function reportSelection(): void {
    if (editor.isEditing()) {
      return;
    }
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
    if (message.type === "set-capabilities") {
      canWrite = message.canWrite;
      layer.setEditable(canWrite);
      if (!canWrite) {
        editor.cancel();
      }
      return;
    }
    marks = message.marks;
    scheduler.repaint();
  });

  document.addEventListener("selectionchange", scheduleSelection);
  document.addEventListener("click", placeOnClick, true);

  return () => {
    gestures.stop();
    editor.stop();
    scheduler.stop();
    stopActivation();
    stopReceiving();
    document.removeEventListener("selectionchange", scheduleSelection);
    document.removeEventListener("click", placeOnClick, true);
    armCursor(false);
    window.cancelAnimationFrame(selectionFrame);
    view.clear();
    layer.destroy();
  };
}
