export const DOWNLOAD_CHOICES = ["edits", "everything", "feedback"] as const;

export type DownloadChoice = (typeof DOWNLOAD_CHOICES)[number];

export const DOWNLOAD_LABEL: Record<DownloadChoice, string> = {
  edits: "File",
  everything: "File + notes",
  feedback: "Feedback",
};

export const DOWNLOAD_NOTE: Record<DownloadChoice, string> = {
  edits:
    "Your file with text changes applied. Comments and sticky notes are excluded.",
  everything:
    "Your file with text changes applied, sticky notes shown in place, and comments listed at the end.",
  feedback:
    "A markdown summary of all comments, sticky notes, and text changes.",
};

export function downloadUrlFor(
  artifactUrl: string,
  choice: DownloadChoice,
): string {
  const url = new URL(artifactUrl);
  url.searchParams.set("download", choice);
  return url.toString();
}
