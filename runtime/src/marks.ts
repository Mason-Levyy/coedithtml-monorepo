import {
  editsAmong,
  markActivatedMessage,
  placedMessage,
  type Anchor,
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
  let canEdit = false;
  let authoring: AuthoringSession | null = null;
  let asking = false;
  let stopped = false;
  const replayed = new Set<string>();
  const madeHere = new Set<string>();

  function madeHereKey(anchor: Anchor, body: string): string {
    return `${anchor.kind === "text" ? anchor.quote : ""}\0${body}`;
  }

  function paint(): void {
    try {
      // An edit is not a mark. The changed words are its own evidence, and
      // painting a highlight over them says a comment is waiting there.
      const painted = marks.filter((mark) => mark.kind !== "edit");
      const placement = paintMarks(layer, view, index, painted, override);
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
    if (authoring?.isEditingText() === true) {
      return;
    }
    const arriving = editsAmong(marks).filter((edit) => !replayed.has(edit.id));
    // An edit this reader just typed is already in the document. Replaying it
    // when the room echoes it back would apply the same change twice.
    const wanted = arriving.filter((edit) => {
      const key = madeHereKey(edit.anchor, edit.body);
      if (!madeHere.has(key)) {
        return true;
      }
      madeHere.delete(key);
      replayed.add(edit.id);
      return false;
    });
    if (wanted.length === 0) {
      return;
    }
    for (const id of applyEdits(document.body, wanted).applied) {
      replayed.add(id);
    }
    // An edit moves the text every comment anchor is measured against, so
    // the index is rebuilt before anything is resolved against it.
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
    holdIndex: (held) => scheduler.holdIndex(held),
    replayEdits,
    editMadeHere: (anchor, body) => madeHere.add(madeHereKey(anchor, body)),
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
      authoring.setCapabilities(canWrite, canEdit);
      scheduler.repaint();
    });
  }

  const stopActivation = onMarkActivated(layer, (markId) =>
    sendToApp(markActivatedMessage(markId)),
  );
  const stopReceiving = receiveFromApp((message) => {
    if (message.type === "set-capabilities") {
      canWrite = message.canWrite;
      canEdit = message.canEdit;
      layer.setEditable(canWrite);
      if (canWrite) {
        askForAuthoring();
      }
      authoring?.setCapabilities(canWrite, canEdit);
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
