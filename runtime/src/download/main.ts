import type { EditEntry, StickyEntry } from "@coedithtml/protocol";
import { applyEdits } from "../edits/apply";
import { paintStickies } from "./paint-stickies";

declare global {
  interface Window {
    __coeditDownload__?: { edits: EditEntry[]; stickies: StickyEntry[] };
  }
}

function applyOnce(): void {
  const payload = window.__coeditDownload__;
  const edits = payload?.edits ?? [];
  if (edits.length > 0) {
    try {
      applyEdits(document.body, edits);
    } catch (error) {
      console.error("[coedit] could not apply the saved edits", error);
    }
  }
  try {
    paintStickies(payload?.stickies ?? []);
  } catch (error) {
    console.error("[coedit] could not show the sticky notes", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyOnce);
} else {
  applyOnce();
}
