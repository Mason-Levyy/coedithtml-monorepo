import { reportFit } from "./fit";
import { sendToApp } from "./transport/bridge";
import { readyMessage } from "./transport/messages";

export const VERSION = "1.0.0";

// Never inspect artifact structure here — artifacts are opaque applications.
export function start(): void {
  try {
    const announceReady = (): void => sendToApp(readyMessage(document.title));
    announceReady();
    // Repeated on load: the chrome may not have been listening the first time.
    window.addEventListener("load", announceReady);
    reportFit();
  } catch (error) {
    console.error("[coedit] failed to report ready", error);
  }
}
