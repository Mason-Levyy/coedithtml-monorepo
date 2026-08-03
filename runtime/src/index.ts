import type { Slide } from "./segmentation/types";
import { resolvePrimaryContainer } from "./segmentation/container";
import { waitUntilReady } from "./segmentation/ready";
import { segmentWithProfile } from "./segmentation/segment";
import { watchForResegmentation } from "./segmentation/watch";
import { sendToApp } from "./transport/bridge";
import {
  activeSlideMessage,
  readyMessage,
  resegmentedMessage,
} from "./transport/messages";
import { listenForAppCommands } from "./transport/receive";
import { scrollToSlide } from "./viewer/navigate";
import { hasStickyOrFixedPositioning } from "./viewer/positioning";
import { watchScrollSpy } from "./viewer/scroll-spy";
import { createStageController } from "./viewer/stage";

declare global {
  interface Window {
    __coedit__?: { version: string };
  }
}

const VERSION = "0.2.0";

async function start(): Promise<void> {
  const container = resolvePrimaryContainer(document);
  await waitUntilReady(container);

  let currentSlides: Slide[] = [];
  const stage = createStageController(container);

  const initial = segmentWithProfile(container);
  currentSlides = initial.slides;
  sendToApp(
    readyMessage(
      initial.slides,
      initial.profile,
      hasStickyOrFixedPositioning(container),
    ),
  );

  watchForResegmentation(container, (result) => {
    try {
      currentSlides = result.slides;
      sendToApp(
        resegmentedMessage(
          result.slides,
          result.profile,
          hasStickyOrFixedPositioning(container),
        ),
      );
    } catch (error) {
      console.error("[coedit] failed to report resegmentation", error);
    }
  });

  watchScrollSpy(
    container,
    () => currentSlides,
    (index) => {
      try {
        sendToApp(activeSlideMessage(index));
      } catch (error) {
        console.error("[coedit] failed to report the active slide", error);
      }
    },
  );

  listenForAppCommands((command) => {
    try {
      if (command.type === "scrollToSlide") {
        scrollToSlide(container, currentSlides, command.index);
      } else {
        stage.setActiveSlide(currentSlides, command.index);
      }
    } catch (error) {
      console.error("[coedit] failed to apply a viewer command", error);
    }
  });
}

if (typeof window !== "undefined") {
  window.__coedit__ = { version: VERSION };
  start().catch((error) => {
    console.error("[coedit] runtime failed to start", error);
  });
}
