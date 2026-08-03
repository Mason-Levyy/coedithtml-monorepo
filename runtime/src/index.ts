import type { SegmentResult, Slide } from "./segmentation/types";
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
import {
  anchorElementFor,
  resolveActiveIndexAfterResegmentation,
} from "./viewer/position";
import { watchScrollSpy } from "./viewer/scroll-spy";
import { createStageController } from "./viewer/stage";

declare global {
  interface Window {
    __coedit__?: { version: string };
  }
}

const VERSION = "0.2.0";

function segmentSafely(container: Element): SegmentResult {
  try {
    return segmentWithProfile(container);
  } catch (error) {
    console.error("[coedit] initial segmentation failed", error);
    return { slides: [], profile: "app" };
  }
}

export async function start(): Promise<void> {
  const container = resolvePrimaryContainer(document);
  await waitUntilReady(container);

  let currentSlides: Slide[] = [];
  let activeIndex = 0;
  let anchorElement: Element | null = null;
  const stage = createStageController(container);

  const initial = segmentSafely(container);
  currentSlides = initial.slides;
  anchorElement = anchorElementFor(container, currentSlides, activeIndex);
  try {
    sendToApp(
      readyMessage(
        initial.slides,
        initial.profile,
        hasStickyOrFixedPositioning(container),
      ),
    );
  } catch (error) {
    console.error("[coedit] failed to report ready", error);
  }

  watchForResegmentation(container, (result) => {
    try {
      activeIndex = resolveActiveIndexAfterResegmentation(
        container,
        anchorElement,
        result.slides,
        activeIndex,
      );
      currentSlides = result.slides;
      anchorElement = anchorElementFor(container, currentSlides, activeIndex);
      sendToApp(
        resegmentedMessage(
          result.slides,
          result.profile,
          hasStickyOrFixedPositioning(container),
          activeIndex,
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
        activeIndex = index;
        anchorElement = anchorElementFor(container, currentSlides, index);
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
