import type { Anchor, TextAnchor } from "./anchor";
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

export type RuntimePlacementMessage = Versioned & {
  type: "placement";
  anchor: Anchor;
};

export type RuntimeOrphansMessage = Versioned & {
  type: "orphans";
  markIds: string[];
};

export type RuntimeToAppMessage =
  | RuntimeReadyMessage
  | RuntimeFitMessage
  | RuntimeSelectionMessage
  | RuntimeMarkActivatedMessage
  | RuntimePlacementMessage
  | RuntimeOrphansMessage;

export type AppRenderMarksMessage = Versioned & {
  type: "render-marks";
  marks: OverlayEntry[];
};

export const MARK_TOOLS = ["sticky"] as const;

export type MarkTool = (typeof MARK_TOOLS)[number];

export type AppSetToolMessage = Versioned & {
  type: "set-tool";
  tool: MarkTool | null;
};

export type AppToRuntimeMessage = AppRenderMarksMessage | AppSetToolMessage;

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

export function placementMessage(anchor: Anchor): RuntimePlacementMessage {
  return { version: BRIDGE_VERSION, type: "placement", anchor };
}

export function orphansMessage(markIds: string[]): RuntimeOrphansMessage {
  return { version: BRIDGE_VERSION, type: "orphans", markIds };
}

export function setToolMessage(tool: MarkTool | null): AppSetToolMessage {
  return { version: BRIDGE_VERSION, type: "set-tool", tool };
}
