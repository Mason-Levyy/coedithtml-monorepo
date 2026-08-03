import type { ReadingProfile, Slide } from "../segmentation/types";

export const BRIDGE_VERSION = 1;

export type RuntimeReadyMessage = {
  version: typeof BRIDGE_VERSION;
  type: "ready";
  slides: Slide[];
  profile: ReadingProfile;
  hasStickyOrFixed: boolean;
};

export type RuntimeResegmentedMessage = {
  version: typeof BRIDGE_VERSION;
  type: "resegmented";
  slides: Slide[];
  profile: ReadingProfile;
  hasStickyOrFixed: boolean;
};

export type RuntimeActiveSlideMessage = {
  version: typeof BRIDGE_VERSION;
  type: "activeSlide";
  index: number;
};

export type RuntimeToAppMessage =
  RuntimeReadyMessage | RuntimeResegmentedMessage | RuntimeActiveSlideMessage;

export function readyMessage(
  slides: Slide[],
  profile: ReadingProfile,
  hasStickyOrFixed: boolean,
): RuntimeReadyMessage {
  return {
    version: BRIDGE_VERSION,
    type: "ready",
    slides,
    profile,
    hasStickyOrFixed,
  };
}

export function resegmentedMessage(
  slides: Slide[],
  profile: ReadingProfile,
  hasStickyOrFixed: boolean,
): RuntimeResegmentedMessage {
  return {
    version: BRIDGE_VERSION,
    type: "resegmented",
    slides,
    profile,
    hasStickyOrFixed,
  };
}

export function activeSlideMessage(index: number): RuntimeActiveSlideMessage {
  return { version: BRIDGE_VERSION, type: "activeSlide", index };
}

export type ScrollToSlideCommand = {
  version: typeof BRIDGE_VERSION;
  type: "scrollToSlide";
  index: number;
};

export type SetStageSlideCommand = {
  version: typeof BRIDGE_VERSION;
  type: "setStageSlide";
  index: number | null;
};

export type AppToRuntimeMessage = ScrollToSlideCommand | SetStageSlideCommand;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseAppToRuntimeMessage(
  value: unknown,
): AppToRuntimeMessage | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== BRIDGE_VERSION) {
    return null;
  }

  if (candidate.type === "scrollToSlide" && isFiniteNumber(candidate.index)) {
    return {
      version: BRIDGE_VERSION,
      type: "scrollToSlide",
      index: candidate.index,
    };
  }

  if (
    candidate.type === "setStageSlide" &&
    (candidate.index === null || isFiniteNumber(candidate.index))
  ) {
    return {
      version: BRIDGE_VERSION,
      type: "setStageSlide",
      index: candidate.index,
    };
  }

  return null;
}
