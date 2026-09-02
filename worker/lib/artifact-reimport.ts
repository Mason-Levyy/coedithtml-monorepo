import {
  isFloating,
  parseOverlayEntry,
  type StickyEntry,
} from "@coedithtml/protocol";

const PAYLOAD_MARKER = "window.__coeditDownload__=";
const SCRIPT_OPEN = `<script>${PAYLOAD_MARKER}`;
const SCRIPT_CLOSE = "</script>";

function payloadJsonIn(html: string): string | null {
  const start = html.indexOf(PAYLOAD_MARKER);
  if (start === -1) {
    return null;
  }
  const from = start + PAYLOAD_MARKER.length;
  const end = html.indexOf(";\n", from);
  return end === -1 ? null : html.slice(from, end);
}

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
