import {
  markActivatedMessage,
  orphansMessage,
  patchMarkMessage,
  placementMessage,
  removeMarkMessage,
  selectionMessage,
  toolCancelledMessage,
  type OverlayEntry,
  type StickyEntry,
} from "@coedithtml/protocol";
import { resolveRevision } from "./config";
import { anchorFromRange } from "./dom/anchor-dom";
import { buildTextIndex, type TextIndex } from "./dom/text-index";
import { createBodyEditor } from "./overlay/edit-body";
import { createOverlayLayer, type OverlayLayer } from "./overlay/layer";
import { startPlaceTool } from "./overlay/place-tool";
import { onMarkActivated, paintMarks } from "./overlay/paint";
import { createRepaintScheduler } from "./overlay/scheduler";
import { startStickyGestures } from "./overlay/sticky-gestures";
import { startStickyTools } from "./overlay/sticky-tools";
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

  // A sticky the app just created is asked for before the next paint builds it.
  let awaitingEdit: string | null = null;

  function openAwaitedEdit(): void {
    const markId = awaitingEdit;
    const element = markId === null ? null : view.elementFor(markId);
    const mark = markId === null ? null : stickyById(markId);
    if (markId === null || element === null || mark === null) {
      return;
    }
    awaitingEdit = null;
    editor.begin(element, markId, mark.body);
  }

  function paint(): void {
    try {
      const result = paintMarks(layer, view, index, marks, override);
      const orphans = result.orphaned.join(",");
      if (orphans !== reportedOrphans) {
        reportedOrphans = orphans;
        sendToApp(orphansMessage(result.orphaned));
      }
      openAwaitedEdit();
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
    onAbandon: (markId) => sendToApp(removeMarkMessage(markId)),
    onChanged: scheduler.repaint,
  });

  const tools = startStickyTools({
    layer,
    view,
    canWrite: () => canWrite,
    onRemove: (markId) => sendToApp(removeMarkMessage(markId)),
    onFit: (markId) =>
      sendToApp(patchMarkMessage(markId, { width: null, height: null })),
  });

  const placing = startPlaceTool({
    revision,
    onPlace: (anchor) => sendToApp(placementMessage(anchor)),
    onCancel: () => sendToApp(toolCancelledMessage()),
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

  const stopActivation = onMarkActivated(layer, (markId) =>
    sendToApp(markActivatedMessage(markId)),
  );
  const stopReceiving = receiveFromApp((message) => {
    if (message.type === "set-tool") {
      placing.arm(message.tool);
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
    if (message.type === "place-at") {
      const anchor = placing.resolve(message.x, message.y);
      if (anchor !== null) {
        sendToApp(placementMessage(anchor));
      }
      return;
    }
    if (message.type === "edit-mark") {
      awaitingEdit = message.markId;
      scheduler.repaint();
      return;
    }
    marks = message.marks;
    scheduler.repaint();
  });

  // The app pins a control to the reported rect, which a scroll moves out from under it.
  function onScroll(): void {
    const selection = document.getSelection();
    if (selection !== null && !selection.isCollapsed) {
      scheduleSelection();
    }
  }

  document.addEventListener("selectionchange", scheduleSelection);
  window.addEventListener("scroll", onScroll, true);

  return () => {
    gestures.stop();
    tools.stop();
    editor.stop();
    scheduler.stop();
    stopActivation();
    stopReceiving();
    placing.stop();
    document.removeEventListener("selectionchange", scheduleSelection);
    window.removeEventListener("scroll", onScroll, true);
    window.cancelAnimationFrame(selectionFrame);
    view.clear();
    layer.destroy();
  };
}
