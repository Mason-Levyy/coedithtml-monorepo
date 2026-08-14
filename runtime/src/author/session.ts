import {
  markActivatedMessage,
  patchMarkMessage,
  placementMessage,
  removeMarkMessage,
  selectionMessage,
  toolCancelledMessage,
} from "@coedithtml/protocol";
import { anchorFromRange } from "../dom/anchor-dom";
import { createBodyEditor } from "../overlay/edit-body";
import { startPlaceTool } from "../overlay/place-tool";
import { startStickyGestures } from "../overlay/sticky-controller";
import type { AuthoringHost, AuthoringSession } from "./contract";

export function startAuthoring(host: AuthoringHost): AuthoringSession {
  let awaitingEdit: string | null = null;
  let selectionFrame = 0;

  const editor = createBodyEditor({
    onCommit: (markId, body) => host.send(patchMarkMessage(markId, { body })),
    onAbandon: (markId) => host.send(removeMarkMessage(markId)),
    onChanged: host.repaint,
  });

  const placing = startPlaceTool({
    revision: host.revision,
    onPlace: (anchor, size) => host.send(placementMessage(anchor, size)),
    onCancel: () => host.send(toolCancelledMessage()),
  });

  const gestures = startStickyGestures({
    layer: host.layer,
    view: host.view,
    markById: host.stickyById,
    canWrite: host.canWrite,
    setOverride: host.setOverride,
    onPatch: (markId, patch) => host.send(patchMarkMessage(markId, patch)),
    onSelect: (markId) => host.send(markActivatedMessage(markId)),
    onEdit: (element, markId, body) => editor.begin(element, markId, body),
    onRemove: (markId) => host.send(removeMarkMessage(markId)),
  });

  function openAwaitedEdit(): void {
    const markId = awaitingEdit;
    if (markId === null) {
      return;
    }
    const element = host.view.elementFor(markId);
    const mark = host.stickyById(markId);
    if (element === null || mark === null) {
      return;
    }
    awaitingEdit = null;
    editor.begin(element, markId, mark.body);
  }

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
      range === null
        ? null
        : anchorFromRange(host.index(), range, host.revision);
    if (range === null || anchor === null) {
      host.send(selectionMessage(null, null));
      return;
    }
    const box = range.getBoundingClientRect();
    host.send(
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

  function onScroll(): void {
    const selection = document.getSelection();
    if (selection !== null && !selection.isCollapsed) {
      scheduleSelection();
    }
  }

  document.addEventListener("selectionchange", scheduleSelection);
  window.addEventListener("scroll", onScroll, true);

  return {
    arm: (tool, color) => placing.arm(tool, color),
    placeAt: (x, y) => {
      const anchor = placing.resolve(x, y);
      if (anchor !== null) {
        host.send(placementMessage(anchor));
      }
    },
    editMark: (markId) => {
      awaitingEdit = markId;
      host.repaint();
    },
    setCanWrite: (canWrite) => {
      if (!canWrite) {
        editor.cancel();
      }
    },
    afterPaint: openAwaitedEdit,
    stop: () => {
      gestures.stop();
      editor.stop();
      placing.stop();
      document.removeEventListener("selectionchange", scheduleSelection);
      window.removeEventListener("scroll", onScroll, true);
      window.cancelAnimationFrame(selectionFrame);
    },
  };
}
