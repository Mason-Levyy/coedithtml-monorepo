import { useEffect, useMemo, useRef, useState } from "react";
import { ArtifactFrame } from "@/components/ArtifactFrame";
import { CommentRail } from "@/components/CommentRail";
import { RailToggle } from "@/components/RailToggle";
import { ShareBar } from "@/components/ShareBar";
import { StickyPad, type PadPoint } from "@/components/StickyPad";
import { useArtifactBridge } from "@/hooks/useArtifactBridge";
import { useDocRoom } from "@/hooks/useDocRoom";
import { useReaderIdentity } from "@/hooks/useReaderIdentity";
import { useRuntimeChannel } from "@/hooks/useRuntimeChannel";
import { useMarkAuthoring } from "@/hooks/useMarkAuthoring";
import { useStickyPlacement } from "@/hooks/useStickyPlacement";
import { framePixelHeight, pointInFrame } from "@/lib/frame-geometry";
import {
  renderMarksMessage,
  setCapabilitiesMessage,
  unresolvedCount,
  type EntryPatch,
  type ReaderPresence,
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
  // Held in a ref: the bridge subscribes once, and the room arrives after it.
  const acted = useRef({
    patch: (markId: string, patch: EntryPatch) => {
      void markId;
      void patch;
    },
    remove: (markId: string) => void markId,
  });
  const bridge = useArtifactBridge({
    sandboxOrigin,
    onPatchMark: (markId, patch) => acted.current.patch(markId, patch),
    onRemoveMark: (markId) => acted.current.remove(markId),
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
  const [stickyNeedsName, setStickyNeedsName] = useState(false);

  const canMarkUp = room.canWrite;

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
  };

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

  const fit = bridge.fit;
  const frameHeight =
    fit && fit.mode === "grows-to-content"
      ? framePixelHeight(fit.contentHeight)
      : undefined;

  // Without a definite parent height the frame's 100% resolves to 150px.
  const columnHeight = frameHeight ? "min-h-dvh" : "h-dvh";

  const selection =
    bridge.selection !== null &&
    bridge.selection.anchor.quote !== dismissedQuote
      ? bridge.selection
      : null;

  useEffect(() => {
    if (selection !== null) {
      setRailOpen(true);
    }
  }, [selection]);

  useEffect(() => {
    if (identity.named) {
      setStickyNeedsName(false);
    }
  }, [identity.named]);

  function authorOf(displayName: string | null): ReaderPresence {
    return displayName === null
      ? identity.reader
      : identity.rename(displayName);
  }

  function writeComment(body: string, displayName: string | null): void {
    if (selection !== null) {
      authoring.comment(selection.anchor, body, authorOf(displayName));
      setDismissedQuote(selection.anchor.quote);
    }
  }

  function writeReply(
    parentId: string,
    body: string,
    displayName: string | null,
  ): void {
    authoring.reply(parentId, body, authorOf(displayName));
  }

  // A sticky carries a name the moment it lands, so one is asked for before it does.
  function askForName(): void {
    setStickyNeedsName(true);
    setRailOpen(true);
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
        <div className="sticky top-0 z-10">
          <ShareBar title={bridge.title ?? fileName} fileName={fileName} />
        </div>
        <div className={frameHeight ? undefined : "min-h-0 flex-1"}>
          <ArtifactFrame
            ref={frame}
            src={src}
            title={fileName}
            height={frameHeight}
          />
        </div>
        {canMarkUp && (
          <div className="fixed bottom-4 left-4 z-20">
            <StickyPad
              armed={sticky.armed}
              color={identity.color}
              onArm={armSticky}
              onDrop={dropSticky}
            />
          </div>
        )}
        {!railOpen && (
          <RailToggle
            unresolved={unresolvedCount(room.entries)}
            onOpen={() => setRailOpen(true)}
          />
        )}
      </div>

      {railOpen && (
        <div className="fixed inset-y-0 right-0 z-30 h-dvh shadow-2xl lg:sticky lg:top-0 lg:z-auto lg:shadow-none">
          <CommentRail
            room={room}
            identity={identity}
            selection={selection}
            promptForName={stickyNeedsName}
            activeMarkId={activeMarkId}
            orphanedMarkIds={bridge.orphanedMarkIds}
            onActivate={setActiveMarkId}
            onComment={writeComment}
            onReply={writeReply}
            onClose={() => setRailOpen(false)}
            onDismissSelection={() =>
              setDismissedQuote(bridge.selection?.anchor.quote ?? null)
            }
          />
        </div>
      )}
    </div>
  );
}
