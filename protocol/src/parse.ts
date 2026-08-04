import {
  BRIDGE_VERSION,
  readyMessage,
  type RuntimeToAppMessage,
} from "./messages";

export function parseRuntimeToAppMessage(
  value: unknown,
): RuntimeToAppMessage | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== BRIDGE_VERSION || candidate.type !== "ready") {
    return null;
  }
  if (typeof candidate.title !== "string") {
    return null;
  }
  return readyMessage(candidate.title);
}
