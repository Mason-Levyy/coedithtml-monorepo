import type { ArtifactMetadata } from "@/lib/artifact-metadata";

const DAY = 24 * 60 * 60 * 1000;

// Thirty days without a view. Long enough that a document circulated slowly
// survives, short enough that the storage of things nobody kept is not
// permanent.
export const IDLE_DAYS = 30;

// A file uploaded, never opened by anybody, and never marked up is a file
// somebody made by accident or thought better of. Seven days is enough to be
// sure of that and short enough to be worth reclaiming.
export const UNUSED_DAYS = 7;

// The owner is told before the sweep rather than after it. There is no email
// in this product, so the warning is a date on the file in their own list --
// which is the only channel an anonymous owner actually has.
export const WARN_DAYS = 7;

// A view is meaningful when it did not happen in the hour after upload. The
// uploader opening their own link to check it worked is not use, and counting
// it would keep every abandoned file alive for ever. Defined once, here.
export const MEANINGFUL_VIEW_AFTER_MS = 60 * 60 * 1000;

// One view an hour is all that is recorded. A document being read by fifty
// people should not cost fifty writes, and the only question ever asked of
// this value is which side of a thirty-day line it falls on.
export const VIEW_RECORD_INTERVAL_MS = 60 * 60 * 1000;

export type ExpiryVerdict = "keep" | "warn" | "idle" | "unused";

export function lastActivityOf(metadata: ArtifactMetadata): number {
  return Date.parse(metadata.lastViewedAt ?? metadata.uploadedAt);
}

export function expiresAtOf(metadata: ArtifactMetadata): string {
  return new Date(lastActivityOf(metadata) + IDLE_DAYS * DAY).toISOString();
}

export function isMeaningfulView(
  metadata: ArtifactMetadata,
  viewedAt: number,
): boolean {
  return viewedAt - Date.parse(metadata.uploadedAt) > MEANINGFUL_VIEW_AFTER_MS;
}

export function shouldRecordView(
  metadata: ArtifactMetadata,
  viewedAt: number,
): boolean {
  const recorded = metadata.lastViewedAt;
  if (recorded === undefined) {
    return true;
  }
  return viewedAt - Date.parse(recorded) > VIEW_RECORD_INTERVAL_MS;
}

// `markedUp` is not asked for here. Whether a room holds anything is a question
// only the room can answer, and the sweep asks it -- but only about the handful
// of artifacts that reach this verdict, rather than about all of them.
export function verdictFor(
  metadata: ArtifactMetadata,
  now: number,
): ExpiryVerdict {
  const idleSince = lastActivityOf(metadata);
  if (Number.isNaN(idleSince)) {
    return "keep";
  }
  if (now - idleSince > IDLE_DAYS * DAY) {
    return "idle";
  }
  const uploadedAt = Date.parse(metadata.uploadedAt);
  if (
    metadata.meaningfulViews === 0 &&
    !Number.isNaN(uploadedAt) &&
    now - uploadedAt > UNUSED_DAYS * DAY
  ) {
    return "unused";
  }
  if (now - idleSince > (IDLE_DAYS - WARN_DAYS) * DAY) {
    return "warn";
  }
  return "keep";
}
