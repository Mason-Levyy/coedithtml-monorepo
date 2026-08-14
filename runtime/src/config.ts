const UNKNOWN_REVISION = "unknown";

const RUNTIME_FILE = "runtime.js";

const AUTHOR_FILE = "author.js";

function currentScriptUrl(): string {
  const script = document.currentScript;
  return script instanceof HTMLScriptElement ? script.src : "";
}

const ownScriptUrl = currentScriptUrl();

export function resolveRevision(): string {
  const configured = window.__coedit__?.config?.revision;
  return typeof configured === "string" && configured.length > 0
    ? configured
    : UNKNOWN_REVISION;
}

export function authorScriptUrl(): string {
  if (ownScriptUrl.endsWith(RUNTIME_FILE)) {
    return ownScriptUrl.slice(0, -RUNTIME_FILE.length) + AUTHOR_FILE;
  }
  return `/__coedit/${resolveRevision()}/${AUTHOR_FILE}`;
}
