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

export type MarkPlacement = {
  offscreen: string[];
  hidden: string[];
  orphaned: string[];
};

export type ArtifactBridgeState = {
  ready: boolean;
  title: string | null;
  fit: ArtifactFit | null;
  selection: ArtifactSelection | null;
  activatedMarkId: string | null;
  placement: Anchor | null;
  marks: MarkPlacement;
  marksReported: boolean;
};

const NOTHING_REPORTED: ArtifactBridgeState = {
  ready: false,
  title: null,
  fit: null,
  selection: null,
  activatedMarkId: null,
  placement: null,
  marks: { offscreen: [], hidden: [], orphaned: [] },
  marksReported: false,
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
    case "placed":
      return {
        ...previous,
        marksReported: true,
        marks: {
          offscreen: message.offscreen,
          hidden: message.hidden,
          orphaned: message.orphaned,
        },
      };
    case "patch-mark":
    case "remove-mark":
    case "tool-cancelled":
      return previous;
  }
}

export type PatchMark = (markId: string, patch: EntryPatch) => void;

export type RemoveMark = (markId: string) => void;

export function useArtifactBridge(options: {
  sandboxOrigin: string;
  src: string;
  onPatchMark: PatchMark;
  onRemoveMark: RemoveMark;
  onToolCancelled: () => void;
}): ArtifactBridgeState {
  const { sandboxOrigin, src } = options;
  const [state, setState] = useState<ArtifactBridgeState>(NOTHING_REPORTED);
  const acted = useRef(options);
  acted.current = options;

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
      if (message.type === "tool-cancelled") {
        acted.current.onToolCancelled();
        return;
      }
      setState((previous) => applyMessage(previous, message));
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sandboxOrigin, src]);

  return state;
}
