import {
  BRIDGE_VERSION,
  fitMessage,
  readyMessage,
  type FitMode,
  type RuntimeToAppMessage,
} from "./messages";

const FIT_MODES: readonly FitMode[] = ["scrolls-itself", "grows-to-content"];

function isFitMode(value: unknown): value is FitMode {
  return FIT_MODES.includes(value as FitMode);
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

  return null;
}
