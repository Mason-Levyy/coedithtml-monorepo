import { useLayoutEffect, useState } from "react";
import {
  parseRuntimeToAppMessage,
  type FitMode,
  type RuntimeToAppMessage,
  type TextAnchor,
  type ViewportRect,
} from "@/lib/bridge-messages";

export type ArtifactFit = { mode: FitMode; contentHeight: number };

export type ArtifactSelection = {
  anchor: TextAnchor;
  rect: ViewportRect | null;
};

export type ArtifactBridgeState = {
  title: string | null;
  fit: ArtifactFit | null;
  selection: ArtifactSelection | null;
  activatedMarkId: string | null;
};

const NOTHING_REPORTED: ArtifactBridgeState = {
  title: null,
  fit: null,
  selection: null,
  activatedMarkId: null,
};

function applyMessage(
  previous: ArtifactBridgeState,
  message: RuntimeToAppMessage,
): ArtifactBridgeState {
  switch (message.type) {
    case "ready":
      return { ...previous, title: message.title };
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
  }
}

export function useArtifactBridge(sandboxOrigin: string): ArtifactBridgeState {
  const [state, setState] = useState<ArtifactBridgeState>(NOTHING_REPORTED);

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
      setState((previous) => applyMessage(previous, message));
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sandboxOrigin]);

  return state;
}
