export const RUNTIME_ASSET_PATH = "/runtime.js";

export const AUTHOR_ASSET_PATH = "/author.js";

const SANDBOX_SCRIPT_PREFIX = "/__coedit/";

const SANDBOX_SCRIPTS = [RUNTIME_ASSET_PATH, AUTHOR_ASSET_PATH];

export type SandboxScript = { revision: string; assetPath: string };

export function runtimeScriptPath(revision: string): string {
  return `${SANDBOX_SCRIPT_PREFIX}${revision}${RUNTIME_ASSET_PATH}`;
}

export function sandboxScriptIn(pathname: string): SandboxScript | null {
  if (!pathname.startsWith(SANDBOX_SCRIPT_PREFIX)) {
    return null;
  }
  const assetPath = SANDBOX_SCRIPTS.find((known) => pathname.endsWith(known));
  if (assetPath === undefined) {
    return null;
  }
  const revision = pathname.slice(
    SANDBOX_SCRIPT_PREFIX.length,
    pathname.length - assetPath.length,
  );
  return revision.length > 0 && !revision.includes("/")
    ? { revision, assetPath }
    : null;
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
