import { useLayoutEffect, useState } from "react";
import { parseRuntimeToAppMessage, type FitMode } from "@/lib/bridge-messages";

export type ArtifactFit = { mode: FitMode; contentHeight: number };

export type ArtifactBridgeState = {
  title: string | null;
  fit: ArtifactFit | null;
};

const NOTHING_REPORTED: ArtifactBridgeState = { title: null, fit: null };

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
      setState((previous) =>
        message.type === "ready"
          ? { ...previous, title: message.title }
          : {
              ...previous,
              fit: {
                mode: message.mode,
                contentHeight: message.contentHeight,
              },
            },
      );
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sandboxOrigin]);

  return state;
}
