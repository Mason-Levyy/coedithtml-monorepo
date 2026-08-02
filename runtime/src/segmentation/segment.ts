import { segmentAsSingleSlide } from "./strategies/fallback";
import { segmentByLayout } from "./strategies/layout";
import { segmentByMarkers } from "./strategies/markers";
import { segmentBySemanticBreaks } from "./strategies/semantic";
import type { SegmentResult, Slide } from "./types";

export function segmentWithProfile(container: Element): SegmentResult {
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

export function segment(container: Element): Slide[] {
  return segmentWithProfile(container).slides;
}
