import { reportFit } from "./fit";
import { startMarks } from "./marks";
import { sendToApp } from "./transport/bridge";
import { readyMessage } from "./transport/messages";

export const VERSION = "1.0.0";

function guard(what: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`[coedit] ${what} failed`, error);
  }
}

// Never inspect artifact structure here — artifacts are opaque applications.
export function start(): void {
  guard("reporting ready", () => {
    const announceReady = (): void => sendToApp(readyMessage(document.title));
    announceReady();
    // Repeated on load: the chrome may not have been listening the first time.
    window.addEventListener("load", announceReady);
    reportFit();
  });
  guard("starting the mark layer", startMarks);
}
