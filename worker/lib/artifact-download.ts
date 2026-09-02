import {
  editsAmong,
  isFloating,
  repliesTo,
  threadsIn,
  type OverlayEntry,
} from "@coedithtml/protocol";

export const DOWNLOAD_ASSET_PATH = "/download.js";

export const DOWNLOAD_QUERY_PARAM = "download";

export const NO_FEEDBACK_YET = "# No feedback yet\n";

export const DOWNLOAD_CHOICES = ["edits", "everything", "feedback"] as const;

export type DownloadChoice = (typeof DOWNLOAD_CHOICES)[number];

export function downloadChoiceIn(value: string | null): DownloadChoice | null {
  return DOWNLOAD_CHOICES.find((choice) => choice === value) ?? null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeForScript(json: string): string {
  return json.replace(
    /[<\u2028\u2029]/g,
    (character) =>
      `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

function speakerOf(entry: OverlayEntry): string {
  const named = entry.author.displayName.trim();
  return named.length > 0 ? named : "Someone";
}

function headingFor(entry: OverlayEntry): string {
  const status = entry.status === "resolved" ? " (resolved)" : "";
  if (entry.anchor.kind === "text") {
    const quote = entry.anchor.quote.replace(/\s+/g, " ").trim();
    return `On &ldquo;${escapeHtml(quote)}&rdquo;${status}`;
  }
  return `Sticky note${status}`;
}

function threadHtml(entries: OverlayEntry[], thread: OverlayEntry): string {
  const spoken = [thread, ...repliesTo(entries, thread.id)]
    .filter((entry) => entry.body.trim().length > 0)
    .map(
      (entry) =>
        `<p><strong>${escapeHtml(speakerOf(entry))}:</strong> ${escapeHtml(entry.body.trim())}</p>`,
    )
    .join("");
  return `<li><h3>${headingFor(thread)}</h3>${spoken}</li>`;
}

export function feedbackSection(entries: OverlayEntry[]): string {
  const threads = threadsIn(entries).filter((entry) => !isFloating(entry));
  if (threads.length === 0) {
    return "";
  }
  return [
    '\n<section style="margin:3rem 1rem;padding-top:1rem;border-top:2px solid #111;font:14px/1.5 system-ui,sans-serif;color:#111">',
    "<h1>Comments</h1>",
    `<ul>${threads.map((thread) => threadHtml(entries, thread)).join("")}</ul>`,
    "</section>\n",
  ].join("");
}

export function downloadScript(
  entries: OverlayEntry[],
  bundle: string,
  choice: DownloadChoice,
): string {
  const edits = editsAmong(entries);
  const stickies = choice === "everything" ? entries.filter(isFloating) : [];
  if (edits.length === 0 && stickies.length === 0) {
    return "";
  }
  const data = escapeForScript(JSON.stringify({ edits, stickies }));
  return `\n<script>window.__coeditDownload__=${data};\n${bundle}</script>\n`;
}

export function appendToArtifact(
  bytes: ArrayBuffer,
  ...additions: string[]
): ArrayBuffer {
  const suffix = new TextEncoder().encode(additions.join(""));
  const combined = new Uint8Array(bytes.byteLength + suffix.byteLength);
  combined.set(new Uint8Array(bytes), 0);
  combined.set(suffix, bytes.byteLength);
  return combined.buffer;
}

export function downloadFileName(fileName: string, choice: DownloadChoice) {
  const stem = fileName.replace(/\.html?$/i, "");
  if (choice === "feedback") {
    return `${stem}-feedback.md`;
  }
  return choice === "everything"
    ? `${stem}-with-feedback.html`
    : `${stem}-edited.html`;
}
