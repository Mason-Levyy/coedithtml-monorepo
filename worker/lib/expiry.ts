import type { ArtifactMetadata } from "@/lib/artifact-metadata";

const DAY = 24 * 60 * 60 * 1000;

export const IDLE_DAYS = 30;
export const UNUSED_DAYS = 7;
export const WARN_DAYS = 7;
export const MEANINGFUL_VIEW_AFTER_MS = 60 * 60 * 1000;
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
