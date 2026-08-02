import { resolvePrimaryContainer } from "./segmentation/container";
import { waitUntilReady } from "./segmentation/ready";
import { segmentWithProfile } from "./segmentation/segment";
import { watchForResegmentation } from "./segmentation/watch";
import { sendToApp } from "./transport/bridge";
import { readyMessage, resegmentedMessage } from "./transport/messages";

declare global {
  interface Window {
    __coedit__?: { version: string };
  }
}

const VERSION = "0.1.0";

async function start(): Promise<void> {
  const container = resolvePrimaryContainer(document);
  await waitUntilReady(container);

  const initial = segmentWithProfile(container);
  sendToApp(readyMessage(initial.slides, initial.profile));

  watchForResegmentation(container, (result) => {
    try {
      sendToApp(resegmentedMessage(result.slides, result.profile));
    } catch (error) {
      console.error("[coedit] failed to report resegmentation", error);
    }
  });
}

if (typeof window !== "undefined") {
  window.__coedit__ = { version: VERSION };
  start().catch((error) => {
    console.error("[coedit] runtime failed to start", error);
  });
}
