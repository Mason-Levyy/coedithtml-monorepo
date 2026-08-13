import {
  repliesTo,
  threadsIn,
  type OverlayEntry,
  type ReplyEntry,
} from "./overlay";

const UNPLACED_NOTE =
  "These were left on content that is no longer in the file.";

function speakerOf(entry: OverlayEntry | ReplyEntry): string {
  return entry.author.displayName.length > 0
    ? entry.author.displayName
    : "Someone";
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function headingFor(entry: OverlayEntry, depth: string): string {
  const suffix = entry.status === "resolved" ? " (resolved)" : "";
  if (entry.anchor.kind === "text") {
    return `${depth} On "${collapse(entry.anchor.quote)}"${suffix}`;
  }
  return `${depth} Sticky note${suffix}`;
}

function saidBy(entry: OverlayEntry | ReplyEntry): string {
  return `**${speakerOf(entry)}:** ${entry.body.trim()}`;
}

function threadBlock(
  entries: OverlayEntry[],
  thread: OverlayEntry,
  depth: string,
): string[] {
  const spoken = [thread, ...repliesTo(entries, thread.id)]
    .filter((entry) => entry.body.trim().length > 0)
    .map(saidBy);
  return [headingFor(thread, depth), ...spoken];
}

function tally(threads: OverlayEntry[]): string {
  const open = threads.filter((thread) => thread.status === "open").length;
  const noun = threads.length === 1 ? "thread" : "threads";
  return `${threads.length} ${noun}, ${open} still open.`;
}

export function overlayToMarkdown(overlay: {
  fileName: string;
  entries: OverlayEntry[];
  orphaned: string[];
}): string {
  const threads = threadsIn(overlay.entries);
  if (threads.length === 0) {
    return "";
  }

  const lost = new Set(overlay.orphaned);
  const placed = threads.filter((thread) => !lost.has(thread.id));
  const unplaced = threads.filter((thread) => lost.has(thread.id));

  const blocks: string[] = [
    `# Feedback on ${overlay.fileName}`,
    tally(threads),
    ...placed.flatMap((thread) => threadBlock(overlay.entries, thread, "##")),
  ];

  if (unplaced.length > 0) {
    blocks.push("## Unplaced", UNPLACED_NOTE);
    for (const thread of unplaced) {
      blocks.push(...threadBlock(overlay.entries, thread, "###"));
    }
  }

  return `${blocks.join("\n\n")}\n`;
}
