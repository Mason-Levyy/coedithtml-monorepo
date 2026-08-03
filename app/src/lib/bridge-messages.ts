export type Slide = {
  index: number;
  startChild: number;
  endChild: number;
  label: string;
};

export type ReadingProfile = "slides" | "pages" | "app";

const BRIDGE_VERSION = 1;

export type RuntimeReadyMessage = {
  version: 1;
  type: "ready";
  slides: Slide[];
  profile: ReadingProfile;
  hasStickyOrFixed: boolean;
};

export type RuntimeResegmentedMessage = {
  version: 1;
  type: "resegmented";
  slides: Slide[];
  profile: ReadingProfile;
  hasStickyOrFixed: boolean;
  activeSlideIndex: number;
};

export type RuntimeActiveSlideMessage = {
  version: 1;
  type: "activeSlide";
  index: number;
};

export type RuntimeToAppMessage =
  RuntimeReadyMessage | RuntimeResegmentedMessage | RuntimeActiveSlideMessage;

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

type SegmentFields = {
  slides: Slide[];
  profile: ReadingProfile;
  hasStickyOrFixed: boolean;
};

function readSegmentFields(
  candidate: Record<string, unknown>,
): SegmentFields | null {
  if (
    !Array.isArray(candidate.slides) ||
    !candidate.slides.every(isSlide) ||
    !isReadingProfile(candidate.profile) ||
    typeof candidate.hasStickyOrFixed !== "boolean"
  ) {
    return null;
  }
  return {
    slides: candidate.slides,
    profile: candidate.profile,
    hasStickyOrFixed: candidate.hasStickyOrFixed,
  };
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

  if (candidate.type === "ready") {
    const fields = readSegmentFields(candidate);
    if (fields === null) return null;
    return { version: BRIDGE_VERSION, type: "ready", ...fields };
  }

  if (candidate.type === "resegmented") {
    const fields = readSegmentFields(candidate);
    if (fields === null || !isFiniteNumber(candidate.activeSlideIndex)) {
      return null;
    }
    return {
      version: BRIDGE_VERSION,
      type: "resegmented",
      ...fields,
      activeSlideIndex: candidate.activeSlideIndex,
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
