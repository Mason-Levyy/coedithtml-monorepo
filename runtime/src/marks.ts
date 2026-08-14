import {
  editsAmong,
  markActivatedMessage,
  placedMessage,
  type OverlayEntry,
  type StickyEntry,
} from "@coedithtml/protocol";
import type { AuthoringHost, AuthoringSession } from "./author/contract";
import { loadAuthoring } from "./author/load";
import { resolveRevision } from "./config";
import { buildTextIndex, type TextIndex } from "./dom/text-index";
import { applyEdits } from "./edits/apply";
import { createOverlayLayer, type OverlayLayer } from "./overlay/layer";
import { onMarkActivated, paintMarks } from "./overlay/paint";
import { revealAnchor } from "./overlay/reveal";
import { createRepaintScheduler } from "./overlay/scheduler";
import {
  createStickyView,
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
  let reportedPlacement = "";
  let canWrite = false;
  let authoring: AuthoringSession | null = null;
  let asking = false;
  let stopped = false;
  const replayed = new Set<string>();

  function paint(): void {
    try {
      const placement = paintMarks(layer, view, index, marks, override);
      const summary = JSON.stringify(placement);
      if (summary !== reportedPlacement) {
        reportedPlacement = summary;
        sendToApp(placedMessage(placement));
      }
      authoring?.afterPaint();
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

  const host: AuthoringHost = {
    layer,
    view,
    revision,
    index: () => index,
    stickyById,
    canWrite: () => canWrite,
    setOverride: (next) => {
      override = next;
      scheduler.holdIndex(next !== null);
      scheduler.repaint();
    },
    repaint: () => scheduler.repaint(),
    send: sendToApp,
  };

  function askForAuthoring(): void {
    if (authoring !== null || asking) {
      return;
    }
    asking = true;
    void loadAuthoring().then((startAuthoring) => {
      asking = false;
      if (startAuthoring === null || stopped) {
        return;
      }
      authoring = startAuthoring(host);
      authoring.setCanWrite(canWrite);
      scheduler.repaint();
    });
  }

  const stopActivation = onMarkActivated(layer, (markId) =>
    sendToApp(markActivatedMessage(markId)),
  );
  const stopReceiving = receiveFromApp((message) => {
    if (message.type === "set-capabilities") {
      canWrite = message.canWrite;
      layer.setEditable(canWrite);
      if (canWrite) {
        askForAuthoring();
      }
      authoring?.setCanWrite(canWrite);
      return;
    }
    if (message.type === "set-tool") {
      authoring?.arm(message.tool, message.color);
      return;
    }
    if (message.type === "place-at") {
      authoring?.placeAt(message.x, message.y);
      return;
    }
    if (message.type === "edit-mark") {
      authoring?.editMark(message.markId);
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

  return () => {
    stopped = true;
    authoring?.stop();
    scheduler.stop();
    stopActivation();
    stopReceiving();
    view.clear();
    layer.destroy();
  };
}
