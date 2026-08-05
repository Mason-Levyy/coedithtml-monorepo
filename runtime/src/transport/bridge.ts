import {
  parseAppToRuntimeMessage,
  type AppToRuntimeMessage,
} from "@coedithtml/protocol";
import { resolveAppOrigin } from "./origin";
import type { RuntimeToAppMessage } from "./messages";

export function sendToApp(message: RuntimeToAppMessage): void {
  if (window.parent === window) {
    return;
  }
  const targetOrigin = resolveAppOrigin();
  if (targetOrigin === null) {
    return;
  }
  window.parent.postMessage(message, targetOrigin);
}

export function receiveFromApp(
  handle: (message: AppToRuntimeMessage) => void,
): () => void {
  function onMessage(event: MessageEvent): void {
    const appOrigin = resolveAppOrigin();
    if (appOrigin === null || event.origin !== appOrigin) {
      return;
    }
    const message = parseAppToRuntimeMessage(event.data);
    if (message !== null) {
      handle(message);
    }
  }

  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}
