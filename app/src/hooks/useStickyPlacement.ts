import { useCallback, useEffect, useRef } from "react";
import type { ArmedTool, StickyIntent } from "@/hooks/useArmedTool";
import { newSticky } from "@/lib/new-entry";
import { paintFor } from "@/lib/paint";
import {
  editMarkMessage,
  placeAtMessage,
  type Anchor,
  type AppToRuntimeMessage,
  type EntryPatch,
  type OverlayEntry,
  type ReaderPresence,
} from "@/lib/protocol";

export type FramePoint = { x: number; y: number };

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
  tools: ArmedTool;
  canMarkUp: boolean;
  reader: ReaderPresence;
  color: string;
  addEntry: (entry: OverlayEntry) => void;
  patchEntry: (markId: string, patch: EntryPatch) => void;
  send: (message: AppToRuntimeMessage) => void;
}): StickyPlacement {
  const { placement, tools, send } = options;
  const { stickyIntent, disarm } = tools;

  const latest = useRef(options);
  latest.current = options;

  const droppedIntentRef = useRef<StickyIntent | null>(null);
  const armedRef = useRef<StickyIntent | null>(stickyIntent);
  armedRef.current = stickyIntent;

  useEffect(() => {
    if (placement === null) {
      return;
    }
    const reason = droppedIntentRef.current ?? { kind: "new" };
    droppedIntentRef.current = null;
    disarm();

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
  }, [placement, disarm]);

  const dropAt = useCallback(
    (point: FramePoint) => {
      droppedIntentRef.current = armedRef.current;
      disarm();
      send(placeAtMessage(point.x, point.y));
    },
    [disarm, send],
  );

  return {
    armed: stickyIntent !== null,
    replacingMarkId:
      stickyIntent?.kind === "replace" ? stickyIntent.markId : null,
    toggleArmed: tools.toggleSticky,
    armForMark: tools.armStickyFor,
    disarm,
    dropAt,
  };
}
