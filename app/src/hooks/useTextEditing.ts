import { useCallback } from "react";
import { newEdit } from "@/lib/new-entry";
import { paintFor } from "@/lib/paint";
import {
  editsAmong,
  type EntryPatch,
  type OverlayEntry,
  type ReaderPresence,
  type TextAnchor,
} from "@/lib/protocol";

export type TextEditing = {
  record: (anchor: TextAnchor, replacement: string) => void;
};

function sameSpan(entry: { anchor: { kind: string } }, anchor: TextAnchor) {
  return (
    entry.anchor.kind === "text" &&
    (entry.anchor as TextAnchor).quote === anchor.quote &&
    (entry.anchor as TextAnchor).path === anchor.path
  );
}

export function useTextEditing(options: {
  entries: OverlayEntry[];
  canEdit: boolean;
  color: string;
  reader: ReaderPresence;
  addEntry: (entry: OverlayEntry) => void;
  patchEntry: (id: string, patch: EntryPatch) => void;
}): TextEditing {
  const { entries, canEdit, color, reader, addEntry, patchEntry } = options;

  const record = useCallback(
    (anchor: TextAnchor, replacement: string) => {
      if (!canEdit) {
        return;
      }
      // Re-editing a span moves the entry already on it. A second entry would
      // anchor to words the first one just replaced, and resolve nowhere.
      const existing = editsAmong(entries).find((edit) =>
        sameSpan(edit, anchor),
      );
      if (existing !== undefined) {
        patchEntry(existing.id, { ifRev: existing.rev, body: replacement });
        return;
      }
      addEntry(
        newEdit({
          anchor,
          body: replacement,
          reader,
          ...paintFor(color),
        }),
      );
    },
    [addEntry, canEdit, color, entries, patchEntry, reader],
  );

  return { record };
}
