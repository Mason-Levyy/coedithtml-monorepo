import type { TextAnchor } from "./anchor";
import {
  BRIDGE_VERSION,
  fitMessage,
  markActivatedMessage,
  readyMessage,
  renderMarksMessage,
  selectionMessage,
  type AppToRuntimeMessage,
  type FitMode,
  type RuntimeToAppMessage,
  type ViewportRect,
} from "./messages";
import type { OverlayEntry } from "./overlay";
import { parseAnchor } from "./parse-anchor";
import { parseOverlayEntry } from "./parse-overlay";
import { asFiniteNumber, asRecord } from "./parse-values";

const FIT_MODES: readonly FitMode[] = ["scrolls-itself", "grows-to-content"];

function isFitMode(value: unknown): value is FitMode {
  return FIT_MODES.includes(value as FitMode);
}

function versionedRecord(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  return record !== null && record.version === BRIDGE_VERSION ? record : null;
}

function parseTextAnchorField(value: unknown): TextAnchor | null {
  const anchor = parseAnchor(value);
  return anchor !== null && anchor.kind === "text" ? anchor : null;
}

function parseViewportRect(value: unknown): ViewportRect | null {
  const record = asRecord(value);
  if (record === null) {
    return null;
  }
  const x = asFiniteNumber(record.x);
  const y = asFiniteNumber(record.y);
  const width = asFiniteNumber(record.width);
  const height = asFiniteNumber(record.height);
  if (x === null || y === null || width === null || height === null) {
    return null;
  }
  return { x, y, width, height };
}

export function parseRuntimeToAppMessage(
  value: unknown,
): RuntimeToAppMessage | null {
  const candidate = versionedRecord(value);
  if (candidate === null) {
    return null;
  }

  if (candidate.type === "ready") {
    return typeof candidate.title === "string"
      ? readyMessage(candidate.title)
      : null;
  }

  if (candidate.type === "fit") {
    const { mode, contentHeight } = candidate;
    if (!isFitMode(mode)) {
      return null;
    }
    return typeof contentHeight === "number" &&
      Number.isFinite(contentHeight) &&
      contentHeight >= 0
      ? fitMessage(mode, contentHeight)
      : null;
  }

  if (candidate.type === "selection") {
    // A cleared selection is the message that dismisses the composer.
    if (candidate.anchor === null || candidate.anchor === undefined) {
      return selectionMessage(null, null);
    }
    const anchor = parseTextAnchorField(candidate.anchor);
    return anchor === null
      ? null
      : selectionMessage(anchor, parseViewportRect(candidate.rect));
  }

  if (candidate.type === "mark-activated") {
    return typeof candidate.markId === "string" && candidate.markId.length > 0
      ? markActivatedMessage(candidate.markId)
      : null;
  }

  return null;
}

export function parseAppToRuntimeMessage(
  value: unknown,
): AppToRuntimeMessage | null {
  const candidate = versionedRecord(value);
  if (candidate === null || candidate.type !== "render-marks") {
    return null;
  }
  if (!Array.isArray(candidate.marks)) {
    return null;
  }

  const marks: OverlayEntry[] = [];
  for (const raw of candidate.marks) {
    const mark = parseOverlayEntry(raw);
    if (mark === null) {
      return null;
    }
    marks.push(mark);
  }
  return renderMarksMessage(marks);
}
