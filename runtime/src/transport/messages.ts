import type { ReadingProfile, Slide } from "../segmentation/types";

export const BRIDGE_VERSION = 1;

export type RuntimeReadyMessage = {
  version: typeof BRIDGE_VERSION;
  type: "ready";
  slides: Slide[];
  profile: ReadingProfile;
};

export type RuntimeResegmentedMessage = {
  version: typeof BRIDGE_VERSION;
  type: "resegmented";
  slides: Slide[];
  profile: ReadingProfile;
};

export type RuntimeToAppMessage =
  RuntimeReadyMessage | RuntimeResegmentedMessage;

export function readyMessage(
  slides: Slide[],
  profile: ReadingProfile,
): RuntimeReadyMessage {
  return { version: BRIDGE_VERSION, type: "ready", slides, profile };
}

export function resegmentedMessage(
  slides: Slide[],
  profile: ReadingProfile,
): RuntimeResegmentedMessage {
  return { version: BRIDGE_VERSION, type: "resegmented", slides, profile };
}
