import { useEffect, useMemo, useRef, useState } from "react";
import { ArtifactFrame } from "@/components/ArtifactFrame";
import { CommentRail } from "@/components/CommentRail";
import type { ComposedMark } from "@/components/CommentComposer";
import { ShareBar } from "@/components/ShareBar";
import { useArtifactBridge } from "@/hooks/useArtifactBridge";
import { useDocRoom } from "@/hooks/useDocRoom";
import { useReaderIdentity } from "@/hooks/useReaderIdentity";
import { useRuntimeChannel } from "@/hooks/useRuntimeChannel";
import { newComment, newReply, newSticky } from "@/lib/new-entry";
import {
  DEFAULT_MARK_COLOR,
  renderMarksMessage,
  setCapabilitiesMessage,
  setToolMessage,
  type Anchor,
  type EntryPatch,
} from "@/lib/protocol";
import { roomUrl } from "@/lib/room-url";

type ArtifactViewerProps = {
  token: string;
  src: string;
  sandboxOrigin: string;
  fileName: string;
};

// An artifact sized in viewport units grows every time its frame does.
const MAX_FRAME_HEIGHT = 10000;

function framePixelHeight(contentHeight: number): string {
  // A collapsed frame measures its content as collapsed, and never recovers.
  const floor = Math.max(window.innerHeight, 1);
  const clamped = Math.min(
    Math.max(contentHeight, floor),
    Math.max(MAX_FRAME_HEIGHT, floor),
  );
  return `${clamped}px`;
}

export function ArtifactViewer({
  token,
  src,
  sandboxOrigin,
  fileName,
}: ArtifactViewerProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  // Held in a ref: the bridge subscribes once, and the room arrives after it.
  const patchMark = useRef((markId: string, patch: EntryPatch) => {
    void markId;
    void patch;
  });
  const bridge = useArtifactBridge(sandboxOrigin, (markId, patch) =>
    patchMark.current(markId, patch),
  );
  const sendToRuntime = useRuntimeChannel(frame, sandboxOrigin);
  const identity = useReaderIdentity();

  const url = useMemo(
    () => roomUrl({ token, artifactUrl: src, origin: window.location.origin }),
    [token, src],
  );
  const room = useDocRoom(url, identity.reader);

  const [activeMarkId, setActiveMarkId] = useState<string | null>(null);
  const [dismissedQuote, setDismissedQuote] = useState<string | null>(null);
  const [placingSticky, setPlacingSticky] = useState(false);

  const canMarkUp = room.canWrite && identity.named;

  useEffect(() => {
    if (bridge.ready) {
      sendToRuntime(renderMarksMessage(room.entries));
    }
  }, [bridge.ready, room.entries, sendToRuntime]);

  // Gated like the marks: a frame that has not booted drops what it is sent.
  useEffect(() => {
    if (bridge.ready) {
      sendToRuntime(setToolMessage(placingSticky ? "sticky" : null));
    }
  }, [bridge.ready, placingSticky, sendToRuntime]);

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

  patchMark.current = (markId, patch) => {
    if (canMarkUp) {
      room.patchEntry(markId, patch);
    }
  };

  // Depending on the room here would drop a second sticky on the next entry.
  const dropSticky = useRef((anchor: Anchor) => {
    void anchor;
  });
  dropSticky.current = (anchor: Anchor) => {
    if (!canMarkUp) {
      return;
    }
    room.addEntry(
      newSticky({
        anchor,
        body: "New note",
        reader: identity.reader,
        color: DEFAULT_MARK_COLOR,
        offsetX: 0,
        offsetY: 0,
      }),
    );
  };

  const placement = bridge.placement;
  useEffect(() => {
    if (placement === null) {
      return;
    }
    setPlacingSticky(false);
    dropSticky.current(placement);
  }, [placement]);

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

  function comment(mark: ComposedMark): void {
    if (selection === null || !canMarkUp) {
      return;
    }
    room.addEntry(
      newComment({
        anchor: selection.anchor,
        body: mark.body,
        reader: identity.reader,
        color: mark.color,
        fill: mark.fill,
      }),
    );
    setDismissedQuote(selection.anchor.quote);
  }

  function reply(parentId: string, body: string): void {
    const parent = room.entries.find((entry) => entry.id === parentId);
    if (parent === undefined || !canMarkUp) {
      return;
    }
    room.addEntry(
      newReply({
        parentId,
        anchor: parent.anchor,
        body,
        reader: identity.reader,
        color: parent.color,
        fill: parent.fill,
      }),
    );
  }

  return (
    <div className={`flex ${columnHeight} bg-card`}>
      <div className="flex min-w-0 flex-1 flex-col">
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
      </div>
      <div className="sticky top-0 hidden h-dvh lg:block">
        <CommentRail
          room={room}
          identity={identity}
          selection={selection}
          activeMarkId={activeMarkId}
          orphanedMarkIds={bridge.orphanedMarkIds}
          placingSticky={placingSticky}
          onPlaceSticky={() => setPlacingSticky((armed) => !armed)}
          onActivate={setActiveMarkId}
          onComment={comment}
          onReply={reply}
          onDismissSelection={() =>
            setDismissedQuote(bridge.selection?.anchor.quote ?? null)
          }
        />
      </div>
    </div>
  );
}
