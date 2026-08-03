export type Slide = {
  index: number;
  startChild: number;
  endChild: number;
  label: string;
};

export type ReadingProfile = "slides" | "pages" | "app";

const BRIDGE_VERSION = 1;

export type RuntimeSegmentMessage = {
  version: 1;
  type: "ready" | "resegmented";
  slides: Slide[];
  profile: ReadingProfile;
  hasStickyOrFixed: boolean;
};

export type RuntimeActiveSlideMessage = {
  version: 1;
  type: "activeSlide";
  index: number;
};

export type RuntimeToAppMessage =
  RuntimeSegmentMessage | RuntimeActiveSlideMessage;

function isSlide(value: unknown): value is Slide {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.index === "number" &&
    typeof candidate.startChild === "number" &&
    typeof candidate.endChild === "number" &&
    typeof candidate.label === "string"
  );
}

function isReadingProfile(value: unknown): value is ReadingProfile {
  return value === "slides" || value === "pages" || value === "app";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseRuntimeToAppMessage(
  value: unknown,
): RuntimeToAppMessage | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== BRIDGE_VERSION) {
    return null;
  }

  if (candidate.type === "activeSlide" && isFiniteNumber(candidate.index)) {
    return {
      version: BRIDGE_VERSION,
      type: "activeSlide",
      index: candidate.index,
    };
  }

  if (
    (candidate.type === "ready" || candidate.type === "resegmented") &&
    Array.isArray(candidate.slides) &&
    candidate.slides.every(isSlide) &&
    isReadingProfile(candidate.profile) &&
    typeof candidate.hasStickyOrFixed === "boolean"
  ) {
    return {
      version: BRIDGE_VERSION,
      type: candidate.type,
      slides: candidate.slides,
      profile: candidate.profile,
      hasStickyOrFixed: candidate.hasStickyOrFixed,
    };
  }

  return null;
}

export type ScrollToSlideCommand = {
  version: 1;
  type: "scrollToSlide";
  index: number;
};

export type SetStageSlideCommand = {
  version: 1;
  type: "setStageSlide";
  index: number | null;
};

export function scrollToSlideCommand(index: number): ScrollToSlideCommand {
  return { version: BRIDGE_VERSION, type: "scrollToSlide", index };
}

export function setStageSlideCommand(
  index: number | null,
): SetStageSlideCommand {
  return { version: BRIDGE_VERSION, type: "setStageSlide", index };
}
