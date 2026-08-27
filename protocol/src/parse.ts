import type { TextAnchor } from "./anchor";
import { normalizeHex } from "./colors";
import {
  BRIDGE_VERSION,
  MARK_TOOLS,
  editMarkMessage,
  fitMessage,
  markActivatedMessage,
  patchMarkMessage,
  placeAtMessage,
  placedMessage,
  placementMessage,
  readyMessage,
  removeMarkMessage,
  renderMarksMessage,
  revealMarkMessage,
  selectionMessage,
  setCapabilitiesMessage,
  setToolMessage,
  SHORTCUT_ACTIONS,
  shortcutMessage,
  textEditedMessage,
  toolCancelledMessage,
  type AppToRuntimeMessage,
  type FitMode,
  type MarkTool,
  type RuntimeToAppMessage,
  type ShortcutAction,
  type ViewportRect,
} from "./messages";
import type { OverlayEntry } from "./overlay";
import { parseAnchor } from "./parse-anchor";
import { parseOverlayEntry } from "./parse-overlay";
import { parseEntryPatch } from "./parse-room";
import { asFilledString, asFiniteNumber, asRecord } from "./parse-values";

const FIT_MODES: readonly FitMode[] = ["scrolls-itself", "grows-to-content"];

function isFitMode(value: unknown): value is FitMode {
  return FIT_MODES.includes(value as FitMode);
}

function isShortcutAction(value: unknown): value is ShortcutAction {
  return SHORTCUT_ACTIONS.some((action) => action === value);
}

function versionedRecord(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  return record !== null && record.version === BRIDGE_VERSION ? record : null;
}

function parseTextAnchorField(value: unknown): TextAnchor | null {
  const anchor = parseAnchor(value);
  return anchor !== null && anchor.kind === "text" ? anchor : null;
}

function parseMarkIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  return value.every((id) => typeof id === "string") ? value : null;
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

  if (candidate.type === "placement") {
    const anchor = parseAnchor(candidate.anchor);
    const width = typeof candidate.width === "number" ? candidate.width : null;
    const height =
      typeof candidate.height === "number" ? candidate.height : null;
    return anchor === null
      ? null
      : placementMessage(
          anchor,
          width !== null && height !== null ? { width, height } : null,
        );
  }

  if (candidate.type === "placed") {
    const offscreen = parseMarkIds(candidate.offscreen);
    const hidden = parseMarkIds(candidate.hidden);
    const orphaned = parseMarkIds(candidate.orphaned);
    return offscreen === null || hidden === null || orphaned === null
      ? null
      : placedMessage({ offscreen, hidden, orphaned });
  }

  if (candidate.type === "tool-cancelled") {
    return toolCancelledMessage();
  }

  if (candidate.type === "shortcut") {
    return isShortcutAction(candidate.action)
      ? shortcutMessage(candidate.action)
      : null;
  }

  if (candidate.type === "patch-mark") {
    const markId = asFilledString(candidate.markId);
    const patch = parseEntryPatch(candidate.patch);
    return markId === null || patch === null
      ? null
      : patchMarkMessage(markId, patch);
  }

  if (candidate.type === "remove-mark") {
    const markId = asFilledString(candidate.markId);
    return markId === null ? null : removeMarkMessage(markId);
  }

  if (candidate.type === "text-edited") {
    const anchor = parseTextAnchorField(candidate.anchor);
    const replacement =
      typeof candidate.replacement === "string" ? candidate.replacement : null;
    const sessionId = asFilledString(candidate.sessionId);
    return anchor === null || replacement === null || sessionId === null
      ? null
      : textEditedMessage(anchor, replacement, sessionId);
  }

  return null;
}

function isMarkTool(value: unknown): value is MarkTool {
  return MARK_TOOLS.some((tool) => tool === value);
}

function parseRenderMarks(
  candidate: Record<string, unknown>,
): AppToRuntimeMessage | null {
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

export function parseAppToRuntimeMessage(
  value: unknown,
): AppToRuntimeMessage | null {
  const candidate = versionedRecord(value);
  if (candidate === null) {
    return null;
  }
  if (candidate.type === "render-marks") {
    return parseRenderMarks(candidate);
  }
  if (candidate.type === "set-tool") {
    const color =
      candidate.color === null || candidate.color === undefined
        ? null
        : normalizeHex(candidate.color);
    if (candidate.tool === null || candidate.tool === undefined) {
      return setToolMessage(null, color);
    }
    return isMarkTool(candidate.tool)
      ? setToolMessage(candidate.tool, color)
      : null;
  }
  if (candidate.type === "set-capabilities") {
    return typeof candidate.canWrite === "boolean"
      ? setCapabilitiesMessage({
          canWrite: candidate.canWrite,
          canEdit: candidate.canEdit === true,
        })
      : null;
  }
  if (candidate.type === "place-at") {
    const x = asFiniteNumber(candidate.x);
    const y = asFiniteNumber(candidate.y);
    return x === null || y === null ? null : placeAtMessage(x, y);
  }
  if (candidate.type === "edit-mark") {
    const markId = asFilledString(candidate.markId);
    return markId === null ? null : editMarkMessage(markId);
  }
  if (candidate.type === "reveal-mark") {
    const markId = asFilledString(candidate.markId);
    return markId === null ? null : revealMarkMessage(markId);
  }
  return null;
}
