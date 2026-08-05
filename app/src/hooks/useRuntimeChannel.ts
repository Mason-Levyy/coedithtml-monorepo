import { useCallback, type RefObject } from "react";
import type { AppToRuntimeMessage } from "@/lib/protocol";

export type SendToRuntime = (message: AppToRuntimeMessage) => void;

export function useRuntimeChannel(
  frame: RefObject<HTMLIFrameElement | null>,
  sandboxOrigin: string,
): SendToRuntime {
  return useCallback(
    (message: AppToRuntimeMessage) => {
      frame.current?.contentWindow?.postMessage(message, sandboxOrigin);
    },
    [frame, sandboxOrigin],
  );
}
