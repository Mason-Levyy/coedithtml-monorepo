import { start, VERSION } from "./index";

// Merged, not replaced: the serving Worker writes the config onto this same
// global before the bundle runs, and assigning a fresh object would drop it.
window.__coedit__ = { ...window.__coedit__, version: VERSION };

start().catch((error: unknown) => {
  console.error("[coedit] runtime failed to start", error);
});
