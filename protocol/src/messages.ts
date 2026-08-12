import type { Anchor, TextAnchor } from "./anchor";
import type { EntryPatch, OverlayEntry } from "./overlay";

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

// Escape is pressed over the frame, where the app's own listener never hears it.
export type RuntimeToolCancelledMessage = Versioned & {
  type: "tool-cancelled";
};

export type RuntimePatchMarkMessage = Versioned & {
  type: "patch-mark";
  markId: string;
  patch: EntryPatch;
};

export type RuntimeToAppMessage =
  | RuntimeReadyMessage
  | RuntimeFitMessage
  | RuntimeSelectionMessage
  | RuntimeMarkActivatedMessage
  | RuntimePlacementMessage
  | RuntimeOrphansMessage
  | RuntimeToolCancelledMessage
  | RuntimePatchMarkMessage
  | RuntimeRemoveMarkMessage;

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

export type AppSetCapabilitiesMessage = Versioned & {
  type: "set-capabilities";
  canWrite: boolean;
};

// Viewport coordinates inside the frame: where a drag off the pad was released.
export type AppPlaceAtMessage = Versioned & {
  type: "place-at";
  x: number;
  y: number;
};

export type AppEditMarkMessage = Versioned & {
  type: "edit-mark";
  markId: string;
};

export type RuntimeRemoveMarkMessage = Versioned & {
  type: "remove-mark";
  markId: string;
};

export type AppToRuntimeMessage =
  | AppRenderMarksMessage
  | AppSetToolMessage
  | AppSetCapabilitiesMessage
  | AppPlaceAtMessage
  | AppEditMarkMessage;

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

export function toolCancelledMessage(): RuntimeToolCancelledMessage {
  return { version: BRIDGE_VERSION, type: "tool-cancelled" };
}

export function setToolMessage(tool: MarkTool | null): AppSetToolMessage {
  return { version: BRIDGE_VERSION, type: "set-tool", tool };
}

export function patchMarkMessage(
  markId: string,
  patch: EntryPatch,
): RuntimePatchMarkMessage {
  return { version: BRIDGE_VERSION, type: "patch-mark", markId, patch };
}

export function setCapabilitiesMessage(
  canWrite: boolean,
): AppSetCapabilitiesMessage {
  return { version: BRIDGE_VERSION, type: "set-capabilities", canWrite };
}

export function placeAtMessage(x: number, y: number): AppPlaceAtMessage {
  return { version: BRIDGE_VERSION, type: "place-at", x, y };
}

export function editMarkMessage(markId: string): AppEditMarkMessage {
  return { version: BRIDGE_VERSION, type: "edit-mark", markId };
}

export function removeMarkMessage(markId: string): RuntimeRemoveMarkMessage {
  return { version: BRIDGE_VERSION, type: "remove-mark", markId };
}
