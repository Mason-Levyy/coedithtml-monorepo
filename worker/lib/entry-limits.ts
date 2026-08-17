import type { OverlayEntry, ReaderPresence } from "@coedithtml/protocol";

// Only `body` was ever capped, so a one-megabyte quote with an empty body
// passed every check -- five hundred times over, in a room nothing reclaims.
// These are the rest. They are deliberately far above anything the app can
// produce: an anchor's context is capped where it is built, an id is a 32-hex
// string, and a path is a handful of `tag[n]` segments.
export const MAX_BODY_LENGTH = 4000;
export const MAX_ID_LENGTH = 100;
export const MAX_QUOTE_LENGTH = 2000;
export const MAX_CONTEXT_LENGTH = 500;
export const MAX_PATH_LENGTH = 1000;
export const MAX_REVISION_LENGTH = 100;
export const MAX_DISPLAY_NAME_LENGTH = 100;
export const MAX_FILL_LENGTH = 32;

function within(value: string | null, limit: number): boolean {
  return value === null || value.length <= limit;
}

function anchorWithinLimits(anchor: OverlayEntry["anchor"]): boolean {
  if (!within(anchor.path, MAX_PATH_LENGTH)) {
    return false;
  }
  if (!within(anchor.revision, MAX_REVISION_LENGTH)) {
    return false;
  }
  if (anchor.kind === "region") {
    return true;
  }
  return (
    within(anchor.quote, MAX_QUOTE_LENGTH) &&
    within(anchor.prefix, MAX_CONTEXT_LENGTH) &&
    within(anchor.suffix, MAX_CONTEXT_LENGTH)
  );
}

export function entryWithinLimits(entry: OverlayEntry): boolean {
  return (
    within(entry.id, MAX_ID_LENGTH) &&
    within(entry.parentId, MAX_ID_LENGTH) &&
    within(entry.body, MAX_BODY_LENGTH) &&
    within(entry.fill, MAX_FILL_LENGTH) &&
    within(entry.author.id, MAX_ID_LENGTH) &&
    within(entry.author.displayName, MAX_DISPLAY_NAME_LENGTH) &&
    anchorWithinLimits(entry.anchor)
  );
}

export function readerWithinLimits(reader: ReaderPresence): boolean {
  return (
    within(reader.id, MAX_ID_LENGTH) &&
    within(reader.displayName, MAX_DISPLAY_NAME_LENGTH)
  );
}
