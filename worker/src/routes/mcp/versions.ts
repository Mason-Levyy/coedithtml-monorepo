export const MODERN_PROTOCOL_VERSION = "2026-07-28";

export const LEGACY_PROTOCOL_VERSION = "2025-11-25";

const DATE_VERSION = /^\d{4}-\d{2}-\d{2}$/;

export function isModernVersion(version: string): boolean {
  return version >= MODERN_PROTOCOL_VERSION;
}

export function legacyVersionFor(requested: unknown): string {
  return typeof requested === "string" &&
    DATE_VERSION.test(requested) &&
    !isModernVersion(requested)
    ? requested
    : LEGACY_PROTOCOL_VERSION;
}
