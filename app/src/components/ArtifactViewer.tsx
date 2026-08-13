import { useEffect, useMemo, useRef, useState } from "react";
import { ArtifactFrame } from "@/components/ArtifactFrame";
import { CommentRail } from "@/components/CommentRail";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { RailButton } from "@/components/RailButton";
import { ReaderChip } from "@/components/ReaderChip";
import { SelectionAction } from "@/components/SelectionAction";
import { StickyPad, type PadPoint } from "@/components/StickyPad";
import { ViewerBar } from "@/components/ViewerBar";
import { useArtifactBridge } from "@/hooks/useArtifactBridge";
import { useDocRoom } from "@/hooks/useDocRoom";
import { useReaderIdentity } from "@/hooks/useReaderIdentity";
import { useRuntimeChannel } from "@/hooks/useRuntimeChannel";
import { useMarkAuthoring } from "@/hooks/useMarkAuthoring";
import { useSelectionAnchor } from "@/hooks/useSelectionAnchor";
import { useStickyPlacement } from "@/hooks/useStickyPlacement";
import { framePixelHeight, pointInFrame } from "@/lib/frame-geometry";
import {
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
};

export function ArtifactViewer({
  token,
  src,
  sandboxOrigin,
  fileName,
}: ArtifactViewerProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const acted = useRef({
    patch: (markId: string, patch: EntryPatch) => {
      void markId;
      void patch;
    },
    remove: (markId: string) => void markId,
    cancelTool: () => {},
  });
  const bridge = useArtifactBridge({
    sandboxOrigin,
    onPatchMark: (markId, patch) => acted.current.patch(markId, patch),
    onRemoveMark: (markId) => acted.current.remove(markId),
    onToolCancelled: () => acted.current.cancelTool(),
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

  useEffect(() => {
    if (bridge.ready) {
      sendToRuntime(renderMarksMessage(room.entries));
    }
  }, [bridge.ready, room.entries, sendToRuntime]);

  useEffect(() => {
    if (bridge.ready) {
      sendToRuntime(setCapabilitiesMessage(canMarkUp));
    }
  }, [bridge.ready, canMarkUp, sendToRuntime]);

  useEffect(() => {
    if (bridge.activatedMarkId !== null) {
      setActiveMarkId(bridge.activatedMarkId);
    }
  }, [bridge.activatedMarkId]);

  const authoring = useMarkAuthoring({
    entries: room.entries,
    canMarkUp,
    color: identity.color,
    addEntry: room.addEntry,
  });

  const sticky = useStickyPlacement({
    placement: bridge.placement,
    ready: bridge.ready,
    canMarkUp,
    reader: identity.reader,
    color: identity.color,
    addEntry: room.addEntry,
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
    <div className={`flex ${columnHeight} bg-card`}>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20">
          <ViewerBar title={bridge.title ?? fileName} fileName={fileName}>
            <CopyLinkButton />
            {canMarkUp && (
              <ReaderChip
                identity={identity}
                open={identityOpen}
                onOpenChange={setIdentityOpen}
              />
            )}
            <RailButton
              open={railOpen}
              unresolved={unresolvedCount(room.entries)}
              onToggle={() => setRailOpen((shown) => !shown)}
            />
            {canMarkUp && (
              <StickyPad
                armed={sticky.armed}
                color={identity.color}
                onArm={armSticky}
                onDrop={dropSticky}
              />
            )}
          </ViewerBar>
        </div>
        <div className={frameHeight ? undefined : "min-h-0 flex-1"}>
          <ArtifactFrame
            ref={frame}
            src={src}
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
      </div>

      {railOpen && (
        <div className="fixed inset-y-0 right-0 z-30 h-dvh shadow-2xl lg:sticky lg:top-0 lg:z-auto lg:shadow-none">
          <CommentRail
            room={room}
            identity={identity}
            composing={composing}
            activeMarkId={activeMarkId}
            marks={bridge.marks}
            onActivate={setActiveMarkId}
            onReveal={(markId) => sendToRuntime(revealMarkMessage(markId))}
            onComment={writeComment}
            onReply={writeReply}
            onClose={() => setRailOpen(false)}
            onDismissSelection={closeComposer}
          />
        </div>
      )}
    </div>
  );
}
