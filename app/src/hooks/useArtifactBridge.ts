import { useEffect, useRef, useState } from "react";
import {
  parseRuntimeToAppMessage,
  type ReadingProfile,
  type ScrollToSlideCommand,
  type SetStageSlideCommand,
  type Slide,
} from "@/lib/bridge-messages";

export type ArtifactBridgeState =
  | { status: "loading" }
  | {
      status: "ready";
      slides: Slide[];
      profile: ReadingProfile;
      hasStickyOrFixed: boolean;
      activeSlideIndex: number;
    };

export type ArtifactBridgeCommand = ScrollToSlideCommand | SetStageSlideCommand;

export type ArtifactBridge = {
  state: ArtifactBridgeState;
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  sendCommand: (command: ArtifactBridgeCommand) => void;
};

export function useArtifactBridge(sandboxOrigin: string): ArtifactBridge {
  const [state, setState] = useState<ArtifactBridgeState>({
    status: "loading",
  });
  const frameRef = useRef<HTMLIFrameElement | null>(null);

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

      if (message.type === "activeSlide") {
        setState((previous) =>
          previous.status === "ready"
            ? { ...previous, activeSlideIndex: message.index }
            : previous,
        );
        return;
      }

      setState({
        status: "ready",
        slides: message.slides,
        profile: message.profile,
        hasStickyOrFixed: message.hasStickyOrFixed,
        activeSlideIndex:
          message.type === "resegmented" ? message.activeSlideIndex : 0,
      });
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sandboxOrigin]);

  function sendCommand(command: ArtifactBridgeCommand): void {
    frameRef.current?.contentWindow?.postMessage(command, sandboxOrigin);
  }

  return { state, frameRef, sendCommand };
}
