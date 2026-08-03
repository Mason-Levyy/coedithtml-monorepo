import type { SegmentResult, Slide } from "./segmentation/types";
import { resolvePrimaryContainer } from "./segmentation/container";
import { waitUntilReady } from "./segmentation/ready";
import { segmentWithProfile } from "./segmentation/segment";
import { watchForStructuralChange } from "./segmentation/watch";
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

export const VERSION = "0.3.0";

function segmentSafely(container: Element): SegmentResult {
  try {
    return segmentWithProfile(container);
  } catch (error) {
    console.error("[coedit] segmentation failed", error);
    return { slides: [], profile: "app" };
  }
}

export async function start(): Promise<void> {
  const container = resolvePrimaryContainer(document);
  await waitUntilReady(container);

  let currentSlides: Slide[] = [];
  let activeIndex = 0;
  let anchorElement: Element | null = null;
  let stagedIndex: number | null = null;
  const stage = createStageController(container);

  function trackActiveSlide(index: number): void {
    activeIndex = index;
    anchorElement = anchorElementFor(container, currentSlides, index);
  }

  const initial = segmentSafely(container);
  currentSlides = initial.slides;
  trackActiveSlide(activeIndex);
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

  watchForStructuralChange(container, () => {
    try {
      const result = segmentSafely(container);
      const resolvedIndex = resolveActiveIndexAfterResegmentation(
        container,
        anchorElement,
        result.slides,
        activeIndex,
      );
      currentSlides = result.slides;
      trackActiveSlide(resolvedIndex);
      // Children added since the last segmentation have never been hidden, so
      // a still-staged document would otherwise start showing its other slides.
      if (stagedIndex !== null) {
        stagedIndex = resolvedIndex;
        stage.setActiveSlide(currentSlides, resolvedIndex);
      }
      sendToApp(
        resegmentedMessage(
          result.slides,
          result.profile,
          hasStickyOrFixedPositioning(container),
          resolvedIndex,
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
        // Staging hides every other slide, and a hidden element reports a
        // zero-height rect that reads as "scrolled past". Position is known
        // exactly while staged, so scroll position is not worth consulting.
        if (stagedIndex !== null) {
          return;
        }
        trackActiveSlide(index);
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
        return;
      }
      stagedIndex = command.index;
      stage.setActiveSlide(currentSlides, command.index);
      if (command.index !== null) {
        trackActiveSlide(command.index);
        // Nothing scrolls when a slide is staged, so this is the only thing
        // that tells the filmstrip which slide the reader is now looking at.
        sendToApp(activeSlideMessage(command.index));
      }
    } catch (error) {
      console.error("[coedit] failed to apply a viewer command", error);
    }
  });
}
