import { segmentAsSingleSlide } from "./strategies/fallback";
import { segmentByLayout } from "./strategies/layout";
import { segmentByMarkers } from "./strategies/markers";
import { segmentBySemanticBreaks } from "./strategies/semantic";
import type { Slide } from "./types";

export function segment(container: Element): Slide[] {
  return (
    segmentByMarkers(container) ??
    segmentBySemanticBreaks(container) ??
    segmentByLayout(container) ??
    segmentAsSingleSlide(container)
  );
}
