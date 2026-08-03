import { segmentAsSingleSlide } from "./strategies/fallback";
import { segmentByLayout } from "./strategies/layout";
import { segmentByMarkers } from "./strategies/markers";
import { segmentBySemanticBreaks } from "./strategies/semantic";
import type { ReadingProfile, SegmentResult, Slide } from "./types";

function asPages(container: Element): SegmentResult {
  const layout = segmentByLayout(container);
  return layout
    ? { slides: layout, profile: "pages" }
    : { slides: segmentAsSingleSlide(container), profile: "pages" };
}

function autoDetect(container: Element): SegmentResult {
  const markers = segmentByMarkers(container);
  if (markers) {
    return { slides: markers, profile: "slides" };
  }

  const semantic = segmentBySemanticBreaks(container);
  if (semantic) {
    return { slides: semantic, profile: "slides" };
  }

  const layout = segmentByLayout(container);
  if (layout) {
    return { slides: layout, profile: "pages" };
  }

  return { slides: segmentAsSingleSlide(container), profile: "app" };
}

// An explicit profile is a property of the link, so it overrides what the
// cascade would have guessed rather than seeding it: everyone opening the same
// link has to end up with the same slide numbers.
export function segmentWithProfile(
  container: Element,
  override?: ReadingProfile,
): SegmentResult {
  if (override === "app") {
    return { slides: segmentAsSingleSlide(container), profile: "app" };
  }
  if (override === "pages") {
    return asPages(container);
  }
  if (override === "slides") {
    return { ...autoDetect(container), profile: "slides" };
  }
  return autoDetect(container);
}

export function segment(container: Element): Slide[] {
  return segmentWithProfile(container).slides;
}
