export type Slide = {
  index: number;
  startChild: number;
  endChild: number;
  label: string;
};

export type ReadingProfile = "slides" | "pages" | "app";

const BRIDGE_VERSION = 1;

export type RuntimeToAppMessage = {
  version: 1;
  type: "ready" | "resegmented";
  slides: Slide[];
  profile: ReadingProfile;
};

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
  if (candidate.type !== "ready" && candidate.type !== "resegmented") {
    return null;
  }
  if (!Array.isArray(candidate.slides) || !candidate.slides.every(isSlide)) {
    return null;
  }
  if (!isReadingProfile(candidate.profile)) {
    return null;
  }
  return {
    version: BRIDGE_VERSION,
    type: candidate.type,
    slides: candidate.slides,
    profile: candidate.profile,
  };
}
