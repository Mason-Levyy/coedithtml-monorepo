export const BRIDGE_VERSION = 1;

export type ReadingProfile = "slides" | "pages" | "app";

export const READING_PROFILES: readonly ReadingProfile[] = [
  "slides",
  "pages",
  "app",
];

export type Slide = {
  index: number;
  startChild: number;
  endChild: number;
  label: string;
};

type Versioned = { version: typeof BRIDGE_VERSION };

export type RuntimeReadyMessage = Versioned & {
  type: "ready";
  slides: Slide[];
  profile: ReadingProfile;
  hasStickyOrFixed: boolean;
};

export type RuntimeResegmentedMessage = Versioned & {
  type: "resegmented";
  slides: Slide[];
  profile: ReadingProfile;
  hasStickyOrFixed: boolean;
  activeSlideIndex: number;
};

export type RuntimeActiveSlideMessage = Versioned & {
  type: "activeSlide";
  index: number;
};

export type RuntimeToAppMessage =
  RuntimeReadyMessage | RuntimeResegmentedMessage | RuntimeActiveSlideMessage;

export type ScrollToSlideCommand = Versioned & {
  type: "scrollToSlide";
  index: number;
};

export type SetStageSlideCommand = Versioned & {
  type: "setStageSlide";
  index: number | null;
};

export type SetProfileCommand = Versioned & {
  type: "setProfile";
  profile: ReadingProfile;
};

export type AppToRuntimeMessage =
  ScrollToSlideCommand | SetStageSlideCommand | SetProfileCommand;

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
  activeSlideIndex: number,
): RuntimeResegmentedMessage {
  return {
    version: BRIDGE_VERSION,
    type: "resegmented",
    slides,
    profile,
    hasStickyOrFixed,
    activeSlideIndex,
  };
}

export function activeSlideMessage(index: number): RuntimeActiveSlideMessage {
  return { version: BRIDGE_VERSION, type: "activeSlide", index };
}

export function scrollToSlideCommand(index: number): ScrollToSlideCommand {
  return { version: BRIDGE_VERSION, type: "scrollToSlide", index };
}

export function setStageSlideCommand(
  index: number | null,
): SetStageSlideCommand {
  return { version: BRIDGE_VERSION, type: "setStageSlide", index };
}

export function setProfileCommand(profile: ReadingProfile): SetProfileCommand {
  return { version: BRIDGE_VERSION, type: "setProfile", profile };
}
