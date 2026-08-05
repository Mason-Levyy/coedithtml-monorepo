const UNKNOWN_REVISION = "unknown";

export function resolveRevision(): string {
  const configured = window.__coedit__?.config?.revision;
  return typeof configured === "string" && configured.length > 0
    ? configured
    : UNKNOWN_REVISION;
}
