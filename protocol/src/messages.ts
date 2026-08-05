export const BRIDGE_VERSION = 1;

type Versioned = { version: typeof BRIDGE_VERSION };

export type RuntimeReadyMessage = Versioned & {
  type: "ready";
  title: string;
};

export type FitMode = "scrolls-itself" | "grows-to-content";

export type RuntimeFitMessage = Versioned & {
  type: "fit";
  mode: FitMode;
  contentHeight: number;
};

export type RuntimeToAppMessage = RuntimeReadyMessage | RuntimeFitMessage;

export function readyMessage(title: string): RuntimeReadyMessage {
  return { version: BRIDGE_VERSION, type: "ready", title };
}

export function fitMessage(
  mode: FitMode,
  contentHeight: number,
): RuntimeFitMessage {
  return { version: BRIDGE_VERSION, type: "fit", mode, contentHeight };
}
