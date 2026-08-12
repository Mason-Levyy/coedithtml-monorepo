import { useLayoutEffect, useRef, useState } from "react";
import {
  parseRuntimeToAppMessage,
  type Anchor,
  type EntryPatch,
  type FitMode,
  type RuntimeToAppMessage,
  type TextAnchor,
  type ViewportRect,
} from "@/lib/protocol";

export type ArtifactFit = { mode: FitMode; contentHeight: number };

export type ArtifactSelection = {
  anchor: TextAnchor;
  rect: ViewportRect | null;
};

export type ArtifactBridgeState = {
  ready: boolean;
  title: string | null;
  fit: ArtifactFit | null;
  selection: ArtifactSelection | null;
  activatedMarkId: string | null;
  placement: Anchor | null;
  orphanedMarkIds: string[];
};

const NOTHING_REPORTED: ArtifactBridgeState = {
  ready: false,
  title: null,
  fit: null,
  selection: null,
  activatedMarkId: null,
  placement: null,
  orphanedMarkIds: [],
};

function applyMessage(
  previous: ArtifactBridgeState,
  message: RuntimeToAppMessage,
): ArtifactBridgeState {
  switch (message.type) {
    case "ready":
      return { ...previous, ready: true, title: message.title };
    case "fit":
      return {
        ...previous,
        fit: { mode: message.mode, contentHeight: message.contentHeight },
      };
    case "selection":
      return {
        ...previous,
        selection:
          message.anchor === null
            ? null
            : { anchor: message.anchor, rect: message.rect },
      };
    case "mark-activated":
      return { ...previous, activatedMarkId: message.markId };
    case "placement":
      return { ...previous, placement: message.anchor };
    case "orphans":
      return { ...previous, orphanedMarkIds: message.markIds };
    case "patch-mark":
    case "remove-mark":
      return previous;
  }
}

export type PatchMark = (markId: string, patch: EntryPatch) => void;

export type RemoveMark = (markId: string) => void;

// Callbacks, not state: a second drag of one sticky would look like a re-render.
export function useArtifactBridge(options: {
  sandboxOrigin: string;
  onPatchMark: PatchMark;
  onRemoveMark: RemoveMark;
}): ArtifactBridgeState {
  const { sandboxOrigin } = options;
  const [state, setState] = useState<ArtifactBridgeState>(NOTHING_REPORTED);
  const acted = useRef(options);
  acted.current = options;

  // Layout effect: a cached frame can post before a deferred effect attaches.
  useLayoutEffect(() => {
    setState(NOTHING_REPORTED);

    function handleMessage(event: MessageEvent): void {
      if (event.origin !== sandboxOrigin) {
        return;
      }
      const message = parseRuntimeToAppMessage(event.data);
      if (message === null) {
        return;
      }
      if (message.type === "patch-mark") {
        acted.current.onPatchMark(message.markId, message.patch);
        return;
      }
      if (message.type === "remove-mark") {
        acted.current.onRemoveMark(message.markId);
        return;
      }
      setState((previous) => applyMessage(previous, message));
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sandboxOrigin]);

  return state;
}
