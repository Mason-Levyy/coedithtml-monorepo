import { useCallback, useEffect, useRef, useState } from "react";
import { newSticky } from "@/lib/new-entry";
import { paintFor } from "@/lib/paint";
import {
  editMarkMessage,
  placeAtMessage,
  setToolMessage,
  type Anchor,
  type AppToRuntimeMessage,
  type EntryPatch,
  type OverlayEntry,
  type ReaderPresence,
} from "@/lib/protocol";

export type FramePoint = { x: number; y: number };

type Intent = { kind: "new" } | { kind: "replace"; markId: string };

export type StickyPlacement = {
  armed: boolean;
  replacingMarkId: string | null;
  toggleArmed: () => void;
  armForMark: (markId: string) => void;
  disarm: () => void;
  dropAt: (point: FramePoint) => void;
};

export function useStickyPlacement(options: {
  placement: Anchor | null;
  placementSize?: { width: number; height: number } | null;
  ready: boolean;
  canMarkUp: boolean;
  reader: ReaderPresence;
  color: string;
  addEntry: (entry: OverlayEntry) => void;
  patchEntry: (markId: string, patch: EntryPatch) => void;
  send: (message: AppToRuntimeMessage) => void;
}): StickyPlacement {
  const { placement, ready, canMarkUp, color, send } = options;
  const [intent, setIntent] = useState<Intent | null>(null);

  const latest = useRef(options);
  latest.current = options;

  const droppedIntentRef = useRef<Intent | null>(null);

  useEffect(() => {
    if (ready) {
      send(
        setToolMessage(
          intent === null ? null : "sticky",
          intent === null ? null : color,
        ),
      );
    }
  }, [intent, ready, color, send]);

  useEffect(() => {
    if (!canMarkUp) {
      setIntent(null);
    }
  }, [canMarkUp]);

  useEffect(() => {
    if (intent === null) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIntent(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [intent]);

  useEffect(() => {
    if (placement === null) {
      return;
    }
    setIntent(null);
    const reason = droppedIntentRef.current ?? { kind: "new" };
    droppedIntentRef.current = null;

    const {
      canMarkUp: allowed,
      reader,
      color,
      addEntry,
      placementSize,
    } = latest.current;
    if (!allowed) {
      return;
    }
    if (reason.kind === "replace") {
      latest.current.patchEntry(reason.markId, { anchor: placement });
      return;
    }
    const sticky = newSticky({
      anchor: placement,
      body: "",
      reader,
      ...paintFor(color),
      offsetX: 0,
      offsetY: 0,
      width: placementSize?.width ?? 180,
      height: placementSize?.height ?? 140,
    });
    addEntry(sticky);
    latest.current.send(editMarkMessage(sticky.id));
  }, [placement]);

  const dropAt = useCallback(
    (point: FramePoint) => {
      setIntent((current) => {
        droppedIntentRef.current = current;
        return null;
      });
      send(placeAtMessage(point.x, point.y));
    },
    [send],
  );

  return {
    armed: intent !== null,
    replacingMarkId: intent?.kind === "replace" ? intent.markId : null,
    toggleArmed: useCallback(
      () => setIntent((current) => (current === null ? { kind: "new" } : null)),
      [],
    ),
    armForMark: useCallback(
      (markId: string) => setIntent({ kind: "replace", markId }),
      [],
    ),
    disarm: useCallback(() => setIntent(null), []),
    dropAt,
  };
}
