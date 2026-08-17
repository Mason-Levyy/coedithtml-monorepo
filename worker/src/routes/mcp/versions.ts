export const MODERN_PROTOCOL_VERSION = "2026-07-28";

export function isModernVersion(version: string): boolean {
  return version >= MODERN_PROTOCOL_VERSION;
}
