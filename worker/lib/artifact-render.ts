export const RUNTIME_SCRIPT_PATH = "/__coedit/runtime.js";

// Blind append, not splice-after-</html>: that tag may be absent or appear
// inside the artifact's own script; trailing content still hoists into place.
export function appendRuntimeScript(bytes: ArrayBuffer): ArrayBuffer {
  const suffix = new TextEncoder().encode(
    `\n<script src="${RUNTIME_SCRIPT_PATH}" defer></script>\n`,
  );
  const combined = new Uint8Array(bytes.byteLength + suffix.byteLength);
  combined.set(new Uint8Array(bytes), 0);
  combined.set(suffix, bytes.byteLength);
  return combined.buffer;
}
