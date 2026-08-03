import {
  activeSlideMessage,
  BRIDGE_VERSION,
  readyMessage,
  READING_PROFILES,
  resegmentedMessage,
  scrollToSlideCommand,
  setProfileCommand,
  setStageSlideCommand,
  type AppToRuntimeMessage,
  type ReadingProfile,
  type RuntimeToAppMessage,
  type Slide,
} from "./messages";

// Hand-written guards rather than Zod: the runtime ships inside someone else's
// document under a hard size budget and takes no dependencies, and both sides
// have to agree on the same check for the version field to mean anything.
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isReadingProfile(value: unknown): value is ReadingProfile {
  return READING_PROFILES.includes(value as ReadingProfile);
}

function isSlide(value: unknown): value is Slide {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    isFiniteNumber(candidate.index) &&
    isFiniteNumber(candidate.startChild) &&
    isFiniteNumber(candidate.endChild) &&
    typeof candidate.label === "string"
  );
}

function versionedFields(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  return candidate.version === BRIDGE_VERSION ? candidate : null;
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
  const candidate = versionedFields(value);
  if (candidate === null) {
    return null;
  }

  if (candidate.type === "activeSlide" && isFiniteNumber(candidate.index)) {
    return activeSlideMessage(candidate.index);
  }

  if (candidate.type === "ready") {
    const fields = readSegmentFields(candidate);
    return fields === null
      ? null
      : readyMessage(fields.slides, fields.profile, fields.hasStickyOrFixed);
  }

  if (candidate.type === "resegmented") {
    const fields = readSegmentFields(candidate);
    if (fields === null || !isFiniteNumber(candidate.activeSlideIndex)) {
      return null;
    }
    return resegmentedMessage(
      fields.slides,
      fields.profile,
      fields.hasStickyOrFixed,
      candidate.activeSlideIndex,
    );
  }

  return null;
}

export function parseAppToRuntimeMessage(
  value: unknown,
): AppToRuntimeMessage | null {
  const candidate = versionedFields(value);
  if (candidate === null) {
    return null;
  }

  if (candidate.type === "scrollToSlide" && isFiniteNumber(candidate.index)) {
    return scrollToSlideCommand(candidate.index);
  }

  if (
    candidate.type === "setStageSlide" &&
    (candidate.index === null || isFiniteNumber(candidate.index))
  ) {
    return setStageSlideCommand(candidate.index);
  }

  if (candidate.type === "setProfile" && isReadingProfile(candidate.profile)) {
    return setProfileCommand(candidate.profile);
  }

  return null;
}
