import { useEffect, useState } from "react";
import {
  parseRuntimeToAppMessage,
  type ReadingProfile,
  type Slide,
} from "@/lib/bridge-messages";

export type ArtifactBridgeState =
  | { status: "loading" }
  | { status: "ready"; slides: Slide[]; profile: ReadingProfile };

export function useArtifactBridge(sandboxOrigin: string): ArtifactBridgeState {
  const [state, setState] = useState<ArtifactBridgeState>({
    status: "loading",
  });

  useEffect(() => {
    setState({ status: "loading" });

    function handleMessage(event: MessageEvent): void {
      if (event.origin !== sandboxOrigin) {
        return;
      }
      const message = parseRuntimeToAppMessage(event.data);
      if (message === null) {
        return;
      }
      setState({
        status: "ready",
        slides: message.slides,
        profile: message.profile,
      });
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sandboxOrigin]);

  return state;
}
