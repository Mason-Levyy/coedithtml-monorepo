import type { TextAnchor } from "./anchor";
import type { OverlayEntry } from "./overlay";

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

export type ViewportRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RuntimeSelectionMessage = Versioned & {
  type: "selection";
  anchor: TextAnchor | null;
  rect: ViewportRect | null;
};

export type RuntimeMarkActivatedMessage = Versioned & {
  type: "mark-activated";
  markId: string;
};

export type RuntimeToAppMessage =
  | RuntimeReadyMessage
  | RuntimeFitMessage
  | RuntimeSelectionMessage
  | RuntimeMarkActivatedMessage;

export type AppRenderMarksMessage = Versioned & {
  type: "render-marks";
  marks: OverlayEntry[];
};

export type AppToRuntimeMessage = AppRenderMarksMessage;

export function readyMessage(title: string): RuntimeReadyMessage {
  return { version: BRIDGE_VERSION, type: "ready", title };
}

export function fitMessage(
  mode: FitMode,
  contentHeight: number,
): RuntimeFitMessage {
  return { version: BRIDGE_VERSION, type: "fit", mode, contentHeight };
}

export function selectionMessage(
  anchor: TextAnchor | null,
  rect: ViewportRect | null,
): RuntimeSelectionMessage {
  return { version: BRIDGE_VERSION, type: "selection", anchor, rect };
}

export function markActivatedMessage(
  markId: string,
): RuntimeMarkActivatedMessage {
  return { version: BRIDGE_VERSION, type: "mark-activated", markId };
}

export function renderMarksMessage(
  marks: OverlayEntry[],
): AppRenderMarksMessage {
  return { version: BRIDGE_VERSION, type: "render-marks", marks };
}
