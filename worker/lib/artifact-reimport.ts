import {
  isFloating,
  parseOverlayEntry,
  type StickyEntry,
} from "@coedithtml/protocol";

const PAYLOAD_MARKER = "window.__coeditDownload__=";
const SCRIPT_OPEN = `<script>${PAYLOAD_MARKER}`;
const SCRIPT_CLOSE = "</script>";

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
export function coeditStickiesIn(
  html: string,
  revision: string,
): StickyEntry[] {
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
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("stickies" in parsed)
  ) {
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

// The wrapper downloadScript writes (artifact-download.ts) both applies its
// edits and paints its stickies the moment the file loads. Left in a
// re-uploaded file, it would keep doing that inside Coedit's own live
// viewer too — on top of the overlay this same data was just restored
// into, drawing every sticky twice. Strip the wrapper once its data has
// been read back out, leaving the artifact's own bytes untouched.
export function withoutCoeditPayload(html: string): string {
  const openAt = html.indexOf(SCRIPT_OPEN);
  if (openAt === -1) {
    return html;
  }
  const closeAt = html.indexOf(SCRIPT_CLOSE, openAt);
  if (closeAt === -1) {
    return html;
  }
  const start = html[openAt - 1] === "\n" ? openAt - 1 : openAt;
  const afterClose = closeAt + SCRIPT_CLOSE.length;
  const end = html[afterClose] === "\n" ? afterClose + 1 : afterClose;
  return html.slice(0, start) + html.slice(end);
}
