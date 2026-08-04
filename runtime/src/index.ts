import { sendToApp } from "./transport/bridge";
import { readyMessage } from "./transport/messages";

export const VERSION = "1.0.0";

// The artifact is an application, not a document to be taken apart. Everything
// this runtime knows how to do is announce that the frame came up.
export function start(): void {
  try {
    sendToApp(readyMessage(document.title));
  } catch (error) {
    console.error("[coedit] failed to report ready", error);
  }
}
