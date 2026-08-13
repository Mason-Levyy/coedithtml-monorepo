import {
  editsAmong,
  markActivatedMessage,
  patchMarkMessage,
  placedMessage,
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
import { applyEdits } from "./edits/apply";
import { createBodyEditor } from "./overlay/edit-body";
import { createOverlayLayer, type OverlayLayer } from "./overlay/layer";
import { startPlaceTool } from "./overlay/place-tool";
import { onMarkActivated, paintMarks } from "./overlay/paint";
import { revealAnchor } from "./overlay/reveal";
import { createRepaintScheduler } from "./overlay/scheduler";
import {
  createStickyView,
  startStickyGestures,
  type StickyOverride,
} from "./overlay/sticky-controller";
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
  let reportedPlacement = "";

  let awaitingEdit: string | null = null;
  const replayed = new Set<string>();

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
      const placement = paintMarks(layer, view, index, marks, override);
      const summary = JSON.stringify(placement);
      if (summary !== reportedPlacement) {
        reportedPlacement = summary;
        sendToApp(placedMessage(placement));
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

  function replayEdits(): void {
    const arriving = editsAmong(marks).filter((edit) => !replayed.has(edit.id));
    if (arriving.length === 0) {
      return;
    }
    const outcome = applyEdits(index, arriving);
    for (const id of outcome.applied) {
      replayed.add(id);
    }
    index = buildTextIndex(document.body);
  }

  function revealMark(markId: string): void {
    const mark = marks.find((entry) => entry.id === markId);
    if (mark !== undefined) {
      revealAnchor(index, mark.anchor);
    }
  }

  const editor = createBodyEditor({
    onCommit: (markId, body) => sendToApp(patchMarkMessage(markId, { body })),
    onAbandon: (markId) => sendToApp(removeMarkMessage(markId)),
    onChanged: scheduler.repaint,
  });

  const placing = startPlaceTool({
    revision,
    onPlace: (anchor, size) => sendToApp(placementMessage(anchor, size)),
    onCancel: () => sendToApp(toolCancelledMessage()),
  });

  const gestures = startStickyGestures({
    layer,
    view,
    markById: stickyById,
    canWrite: () => canWrite,
    setOverride: (next) => {
      override = next;
      scheduler.holdIndex(next !== null);
      scheduler.repaint();
    },
    onPatch: (markId, patch) => sendToApp(patchMarkMessage(markId, patch)),
    onSelect: (markId) => sendToApp(markActivatedMessage(markId)),
    onEdit: (element, markId, body) => editor.begin(element, markId, body),
    onRemove: (markId) => sendToApp(removeMarkMessage(markId)),
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

  function scheduleSelection(): void {
    window.cancelAnimationFrame(selectionFrame);
    selectionFrame = window.requestAnimationFrame(reportSelection);
  }

  const stopActivation = onMarkActivated(layer, (markId) =>
    sendToApp(markActivatedMessage(markId)),
  );
  const stopReceiving = receiveFromApp((message) => {
    if (message.type === "set-tool") {
      placing.arm(message.tool, message.color);
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
    if (message.type === "reveal-mark") {
      revealMark(message.markId);
      return;
    }
    marks = message.marks;
    replayEdits();
    scheduler.repaint();
  });

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
