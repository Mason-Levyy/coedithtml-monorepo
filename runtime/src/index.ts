import { reportFit } from "./fit";
import { startMarks } from "./marks";
import { sendToApp } from "./transport/bridge";
import { readyMessage } from "./transport/messages";

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
