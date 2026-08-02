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
