export const RUNTIME_ASSET_PATH = "/runtime.js";

const RUNTIME_SCRIPT_PREFIX = "/__coedit/";
const RUNTIME_SCRIPT_SUFFIX = "/runtime.js";

export function runtimeScriptPath(revision: string): string {
  return `${RUNTIME_SCRIPT_PREFIX}${revision}${RUNTIME_SCRIPT_SUFFIX}`;
}

export function revisionInRuntimePath(pathname: string): string | null {
  if (
    !pathname.startsWith(RUNTIME_SCRIPT_PREFIX) ||
    !pathname.endsWith(RUNTIME_SCRIPT_SUFFIX)
  ) {
    return null;
  }
  const revision = pathname.slice(
    RUNTIME_SCRIPT_PREFIX.length,
    pathname.length - RUNTIME_SCRIPT_SUFFIX.length,
  );
  return revision.length > 0 && !revision.includes("/") ? revision : null;
}

export function appendRuntimeScript(
  bytes: ArrayBuffer,
  revision: string,
): ArrayBuffer {
  const suffix = new TextEncoder().encode(
    `\n<script src="${runtimeScriptPath(revision)}" defer></script>\n`,
  );
  const combined = new Uint8Array(bytes.byteLength + suffix.byteLength);
  combined.set(new Uint8Array(bytes), 0);
  combined.set(suffix, bytes.byteLength);
  return combined.buffer;
}
