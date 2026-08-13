import type { EditEntry } from "@coedithtml/protocol";
import { buildTextIndex } from "../dom/text-index";
import { applyEdits } from "../edits/apply";

declare global {
  interface Window {
    __coeditDownload__?: { edits: EditEntry[] };
  }
}

function applyOnce(): void {
  const edits = window.__coeditDownload__?.edits ?? [];
  if (edits.length === 0) {
    return;
  }
  try {
    applyEdits(buildTextIndex(document.body), edits);
  } catch (error) {
    console.error("[coedit] could not apply the saved edits", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyOnce);
} else {
  applyOnce();
}
