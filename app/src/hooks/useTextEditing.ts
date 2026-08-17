import { useCallback, useRef } from "react";
import { newEdit } from "@/lib/new-entry";
import { paintFor } from "@/lib/paint";
import {
  editsAmong,
  type EditEntry,
  type EntryPatch,
  type OverlayEntry,
  type ReaderPresence,
  type TextAnchor,
} from "@/lib/protocol";

export type TextEditing = {
  record: (anchor: TextAnchor, replacement: string, sessionId: string) => void;
};

function sameSpan(entry: EditEntry, anchor: TextAnchor) {
  return (
    entry.anchor.kind === "text" &&
    entry.anchor.quote === anchor.quote &&
    entry.anchor.path === anchor.path
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
  const bySession = useRef(new Map<string, string>());

  const record = useCallback(
    (anchor: TextAnchor, replacement: string, sessionId: string) => {
      if (!canEdit) {
        return;
      }
      const changes = editsAmong(entries);
      // One caret visit owns one entry, however often it autosaves. Matching a
      // later save by quoted text instead would fail the moment the span
      // widened, and the second entry would quote words the first one replaced.
      const held = bySession.current.get(sessionId);
      const existing =
        changes.find((edit) => edit.id === held) ??
        changes.find((edit) => sameSpan(edit, anchor));
      if (existing !== undefined) {
        bySession.current.set(sessionId, existing.id);
        patchEntry(existing.id, {
          ifRev: existing.rev,
          anchor,
          body: replacement,
        });
        return;
      }
      const entry = newEdit({
        anchor,
        body: replacement,
        reader,
        ...paintFor(color),
      });
      bySession.current.set(sessionId, entry.id);
      addEntry(entry);
    },
    [addEntry, canEdit, color, entries, patchEntry, reader],
  );

  return { record };
}
