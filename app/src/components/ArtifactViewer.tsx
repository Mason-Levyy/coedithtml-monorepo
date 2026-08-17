import { useEffect, useMemo, useRef, useState } from "react";
import { ArtifactFrame } from "@/components/ArtifactFrame";
import { CommentRail } from "@/components/CommentRail";
import { EditPen } from "@/components/EditPen";
import { FinishTour } from "@/components/FinishTour";
import { RailButton } from "@/components/RailButton";
import { ReaderChip } from "@/components/ReaderChip";
import { SaveIndicator } from "@/components/SaveIndicator";
import { SelectionAction } from "@/components/SelectionAction";
import { ShareMenu } from "@/components/ShareMenu";
import { StickyPad, type PadPoint } from "@/components/StickyPad";
import { UndoRedo } from "@/components/UndoRedo";

import { ViewerBar } from "@/components/ViewerBar";
import { useArmedTool } from "@/hooks/useArmedTool";
import { useArtifactBridge } from "@/hooks/useArtifactBridge";
import { useDocRoom } from "@/hooks/useDocRoom";
import { useReaderIdentity } from "@/hooks/useReaderIdentity";
import { useRuntimeChannel } from "@/hooks/useRuntimeChannel";
import { useMarkAuthoring } from "@/hooks/useMarkAuthoring";
import { useSelectionAnchor } from "@/hooks/useSelectionAnchor";
import { useStickyPlacement } from "@/hooks/useStickyPlacement";
import { useTextEditing } from "@/hooks/useTextEditing";
import { frameSrcFor, withoutUnlockGrant } from "@/lib/artifact-src";
import { framePixelHeight, pointInFrame } from "@/lib/frame-geometry";
import type { LinkPermission } from "@/lib/link-permission";
import {
  editsAmong,
  feedbackHandoffPrompt,
  renderMarksMessage,
  revealMarkMessage,
  setCapabilitiesMessage,
  unresolvedCount,
  type EntryPatch,
  type ReaderPresence,
  type TextAnchor,
} from "@/lib/protocol";
import { roomUrl } from "@/lib/room-url";

type ArtifactViewerProps = {
  token: string;
  src: string;
  sandboxOrigin: string;
  fileName: string;
  revision: string;
  shareLinks: Partial<Record<LinkPermission, string>>;
  tutorial: boolean;
};

export function ArtifactViewer({
  token,
  src,
  sandboxOrigin,
  fileName,
  revision,
  shareLinks,
  tutorial,
}: ArtifactViewerProps) {
  void revision;
  const frame = useRef<HTMLIFrameElement>(null);
  const stepping = useRef({ back: () => {}, forward: () => {} });
  const [resetCount, setResetCount] = useState(0);
  const frameSrc = useMemo(
    () => frameSrcFor(src, resetCount),
    [src, resetCount],
  );
  const acted = useRef({
    patch: (markId: string, patch: EntryPatch) => {
      void markId;
      void patch;
    },
    remove: (markId: string) => void markId,
    cancelTool: () => {},
    textEdited: (
      anchor: TextAnchor,
      replacement: string,
      sessionId: string,
    ) => {
      void anchor;
      void replacement;
      void sessionId;
    },
  });
  const bridge = useArtifactBridge({
    sandboxOrigin,
    src: frameSrc,
    onPatchMark: (markId, patch) => acted.current.patch(markId, patch),
    onRemoveMark: (markId) => acted.current.remove(markId),
    onToolCancelled: () => acted.current.cancelTool(),
    onTextEdited: (anchor, replacement, sessionId) =>
      acted.current.textEdited(anchor, replacement, sessionId),
  });
  const sendToRuntime = useRuntimeChannel(frame, sandboxOrigin);
  const identity = useReaderIdentity();

  const url = useMemo(
    () => roomUrl({ token, artifactUrl: src, origin: window.location.origin }),
    [token, src],
  );
  const room = useDocRoom(url, identity.reader);

  const [activeMarkId, setActiveMarkId] = useState<string | null>(null);
  const [dismissedQuote, setDismissedQuote] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(() => window.innerWidth >= 1024);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [composing, setComposing] = useState<TextAnchor | null>(null);

  const canMarkUp = room.canWrite;

  const feedback = useMemo(
    () =>
      feedbackHandoffPrompt({
        fileName,
        entries: room.entries,
        orphaned: bridge.marks.orphaned,
        artifactUrl: withoutUnlockGrant(src),
      }),
    [fileName, src, room.entries, bridge.marks.orphaned],
  );

  useEffect(() => {
    if (bridge.ready) {
      sendToRuntime(renderMarksMessage(room.entries));
    }
  }, [bridge.ready, room.entries, sendToRuntime]);

  useEffect(() => {
    if (bridge.ready) {
      sendToRuntime(
        setCapabilitiesMessage({ canWrite: canMarkUp, canEdit: room.canEdit }),
      );
    }
  }, [bridge.ready, canMarkUp, room.canEdit, sendToRuntime]);

  useEffect(() => {
    if (bridge.activatedMarkId !== null) {
      setActiveMarkId(bridge.activatedMarkId);
    }
  }, [bridge.activatedMarkId]);

  // A caret inside the artifact keeps its keystrokes in the artifact's own
  // document, so this listener is already silent while somebody is typing
  // there — which is right, because inside a live caret the browser's undo is
  // the one they mean. The same courtesy is owed to the rail's own fields.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const inField =
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          ["INPUT", "TEXTAREA"].includes(event.target.tagName));
      if (inField || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      if (event.key.toLowerCase() !== "z") {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) {
        stepping.current.forward();
        return;
      }
      stepping.current.back();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const authoring = useMarkAuthoring({
    entries: room.entries,
    canMarkUp,
    color: identity.color,
    addEntry: room.addEntry,
  });

  const textEditing = useTextEditing({
    entries: room.entries,
    canEdit: room.canEdit,
    color: identity.color,
    reader: identity.reader,
    addEntry: room.addEntry,
    patchEntry: room.patchEntry,
  });

  const tools = useArmedTool({
    ready: bridge.ready,
    canMarkUp,
    canEdit: room.canEdit,
    color: identity.color,
    send: sendToRuntime,
  });

  const sticky = useStickyPlacement({
    placement: bridge.placement,
    placementSize: bridge.placementSize,
    tools,
    canMarkUp,
    reader: identity.reader,
    color: identity.color,
    addEntry: room.addEntry,
    patchEntry: room.patchEntry,
    send: sendToRuntime,
  });

  acted.current = {
    patch: (markId, patch) => {
      if (canMarkUp) {
        room.patchEntry(markId, patch);
      }
    },
    remove: (markId) => {
      if (canMarkUp) {
        room.removeEntry(markId);
      }
    },
    cancelTool: sticky.disarm,
    textEdited: textEditing.record,
  };

  const fit = bridge.fit;
  const frameHeight =
    fit && fit.mode === "grows-to-content"
      ? framePixelHeight(fit.contentHeight)
      : undefined;

  const columnHeight = frameHeight ? "min-h-dvh" : "h-dvh";

  const selection =
    bridge.selection !== null &&
    bridge.selection.anchor.quote !== dismissedQuote
      ? bridge.selection
      : null;

  const selectionAt = useSelectionAnchor(frame, selection?.rect ?? null);

  useEffect(() => {
    if (selection !== null && selection.rect === null) {
      setComposing(selection.anchor);
      setRailOpen(true);
    }
  }, [selection]);

  function authorOf(displayName: string | null): ReaderPresence {
    return displayName === null
      ? identity.reader
      : identity.rename(displayName);
  }

  function openComposer(anchor: TextAnchor): void {
    setComposing(anchor);
    setRailOpen(true);
  }

  function closeComposer(): void {
    setDismissedQuote(composing?.quote ?? null);
    setComposing(null);
  }

  function writeComment(body: string, displayName: string | null): void {
    if (composing !== null) {
      authoring.comment(composing, body, authorOf(displayName));
      closeComposer();
    }
  }

  function writeReply(
    parentId: string,
    body: string,
    displayName: string | null,
  ): void {
    authoring.reply(parentId, body, authorOf(displayName));
  }

  function askForName(): void {
    setIdentityOpen(true);
  }

  function removeEdit(markId: string): void {
    room.removeEntry(markId);
    setResetCount((count) => count + 1);
  }

  function stepBack(): void {
    if (room.undo()) {
      setResetCount((count) => count + 1);
    }
  }

  function stepForward(): void {
    if (room.redo()) {
      setResetCount((count) => count + 1);
    }
  }

  stepping.current = { back: stepBack, forward: stepForward };

  function removeEveryEdit(): void {
    for (const edit of editsAmong(room.entries)) {
      room.removeEntry(edit.id);
    }
    setResetCount((count) => count + 1);
  }

  function armSticky(): void {
    if (identity.named) {
      sticky.toggleArmed();
      return;
    }
    askForName();
  }

  function dropSticky(point: PadPoint): void {
    if (!identity.named) {
      askForName();
      return;
    }
    const inside = pointInFrame(frame.current, point);
    if (inside !== null) {
      sticky.dropAt(inside);
    }
  }

  return (
    <div className={`flex flex-col ${columnHeight} bg-card relative`}>
      {/* Full-width header spanning the entire top */}
      <header className="sticky top-0 z-30 w-full flex-none">
        <ViewerBar title={bridge.title ?? fileName} fileName={fileName}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            {canMarkUp && (
              <UndoRedo
                canUndo={room.canUndo}
                canRedo={room.canRedo}
                onUndo={stepBack}
                onRedo={stepForward}
              />
            )}
            {canMarkUp && <SaveIndicator state={room.saveState} />}
            {tutorial && <FinishTour />}
            {canMarkUp && (
              <StickyPad
                armed={sticky.armed}
                color={identity.color}
                onArm={armSticky}
                onDrop={dropSticky}
              />
            )}
            {room.canEdit && (
              <EditPen
                armed={tools.editing}
                color={identity.color}
                onToggle={tools.toggleEditing}
              />
            )}
            <RailButton
              open={railOpen}
              unresolved={unresolvedCount(room.entries)}
              onToggle={() => setRailOpen((shown) => !shown)}
            />
            <ShareMenu
              feedback={feedback}
              artifactUrl={src}
              shareLinks={shareLinks}
            />
          </div>
          {canMarkUp && (
            <div className="ml-4 flex items-center pl-4 border-l border-line/60 sm:ml-5 sm:pl-5">
              <ReaderChip
                identity={identity}
                open={identityOpen}
                onOpenChange={setIdentityOpen}
              />
            </div>
          )}
        </ViewerBar>
      </header>

      {/* Main content area under the header */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className={frameHeight ? undefined : "min-h-0 flex-1"}>
          <ArtifactFrame
            key={frameSrc}
            ref={frame}
            src={frameSrc}
            title={fileName}
            height={frameHeight}
          />
        </div>
        {selection !== null &&
          canMarkUp &&
          selectionAt !== null &&
          composing === null && (
            <SelectionAction
              at={selectionAt}
              onComment={() => openComposer(selection.anchor)}
            />
          )}

        {/* Sidebar drawer — sits strictly below the top header on the right */}
        {railOpen && (
          <div className="fixed top-[45px] right-0 bottom-0 z-20 shadow-2xl">
            <CommentRail
              room={room}
              identity={identity}
              composing={composing}
              activeMarkId={activeMarkId}
              marks={bridge.marks}
              replacingMarkId={sticky.replacingMarkId}
              onActivate={setActiveMarkId}
              onReveal={(markId) => sendToRuntime(revealMarkMessage(markId))}
              onReplace={sticky.armForMark}
              onComment={writeComment}
              onReply={writeReply}
              onRemoveEdit={removeEdit}
              onRemoveEveryEdit={removeEveryEdit}
              onClose={() => setRailOpen(false)}
              onDismissSelection={closeComposer}
            />
          </div>
        )}
      </div>
    </div>
  );
}
