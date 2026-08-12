import { useCallback, useEffect, useRef, useState } from "react";
import { newSticky } from "@/lib/new-entry";
import { paintFor } from "@/lib/paint";
import {
  editMarkMessage,
  placeAtMessage,
  setToolMessage,
  type Anchor,
  type AppToRuntimeMessage,
  type OverlayEntry,
  type ReaderPresence,
} from "@/lib/protocol";

export type FramePoint = { x: number; y: number };

export type StickyPlacement = {
  armed: boolean;
  toggleArmed: () => void;
  disarm: () => void;
  dropAt: (point: FramePoint) => void;
};

export function useStickyPlacement(options: {
  placement: Anchor | null;
  ready: boolean;
  canMarkUp: boolean;
  reader: ReaderPresence;
  color: string;
  addEntry: (entry: OverlayEntry) => void;
  send: (message: AppToRuntimeMessage) => void;
}): StickyPlacement {
  const { placement, ready, canMarkUp, send } = options;
  const [armed, setArmed] = useState(false);

  // Held in a ref so a second sticky is not dropped when the room next changes.
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    if (ready) {
      send(setToolMessage(armed ? "sticky" : null));
    }
  }, [armed, ready, send]);

  useEffect(() => {
    if (!canMarkUp) {
      setArmed(false);
    }
  }, [canMarkUp]);

  // Covers focus in the app; the frame reports its own Escape over the bridge.
  useEffect(() => {
    if (!armed) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setArmed(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [armed]);

  useEffect(() => {
    if (placement === null) {
      return;
    }
    setArmed(false);
    const { canMarkUp: allowed, reader, color, addEntry } = latest.current;
    if (!allowed) {
      return;
    }
    const sticky = newSticky({
      anchor: placement,
      body: "",
      reader,
      ...paintFor(color),
      offsetX: 0,
      offsetY: 0,
    });
    addEntry(sticky);
    latest.current.send(editMarkMessage(sticky.id));
  }, [placement]);

  const dropAt = useCallback(
    (point: FramePoint) => {
      setArmed(false);
      send(placeAtMessage(point.x, point.y));
    },
    [send],
  );

  return {
    armed,
    toggleArmed: useCallback(() => setArmed((on) => !on), []),
    disarm: useCallback(() => setArmed(false), []),
    dropAt,
  };
}
