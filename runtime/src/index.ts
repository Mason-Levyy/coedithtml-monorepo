import { reportFit } from "./fit";
import { startMarks } from "./marks";
import { sendToApp } from "./transport/bridge";
import { readyMessage } from "./transport/messages";

// Published as window.__coedit__.version inside somebody else's document, and
// the only version number this product has anywhere. It said 1.0.0 from the
// first commit, through five versions of a thing that has not shipped.
export const VERSION = "0.6.1";

function guard(what: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`[coedit] ${what} failed`, error);
  }
}

export function start(): void {
  guard("reporting ready", () => {
    const announceReady = (): void => sendToApp(readyMessage(document.title));
    announceReady();
    window.addEventListener("load", announceReady);
    reportFit();
  });
  guard("starting the mark layer", startMarks);
}
