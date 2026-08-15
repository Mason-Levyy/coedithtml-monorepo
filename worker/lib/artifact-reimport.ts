import {
  isFloating,
  parseOverlayEntry,
  type StickyEntry,
} from "@coedithtml/protocol";

const PAYLOAD_MARKER = "window.__coeditDownload__=";

// downloadScript (artifact-download.ts) always writes the payload as
// `${json};\n${bundle}`, and JSON.stringify never emits a raw newline byte
// inside a string value — so the first ";\n" after the marker is always the
// boundary we wrote, never something inside the JSON itself.
function payloadJsonIn(html: string): string | null {
  const start = html.indexOf(PAYLOAD_MARKER);
  if (start === -1) {
    return null;
  }
  const from = start + PAYLOAD_MARKER.length;
  const end = html.indexOf(";\n", from);
  return end === -1 ? null : html.slice(from, end);
}

// A file Coedit produced carries its own comments back with it. Detecting
// them here lets a re-upload offer to restore them as live, editable
// stickies instead of leaving them as the static painting the download drew.
export function coeditStickiesIn(html: string, revision: string): StickyEntry[] {
  const json = payloadJsonIn(html);
  if (json === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null || !("stickies" in parsed)) {
    return [];
  }
  const candidates = (parsed as { stickies: unknown }).stickies;
  if (!Array.isArray(candidates)) {
    return [];
  }

  const stickies: StickyEntry[] = [];
  for (const candidate of candidates) {
    const entry = parseOverlayEntry(candidate);
    if (entry !== null && isFloating(entry)) {
      stickies.push({ ...entry, anchor: { ...entry.anchor, revision } });
    }
  }
  return stickies;
}
