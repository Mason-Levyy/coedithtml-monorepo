import { useCallback } from "react";
import { newComment, newReply } from "@/lib/new-entry";
import { paintFor } from "@/lib/paint";
import type { OverlayEntry, ReaderPresence, TextAnchor } from "@/lib/protocol";

export type MarkAuthoring = {
  comment: (anchor: TextAnchor, body: string, author: ReaderPresence) => void;
  reply: (parentId: string, body: string, author: ReaderPresence) => void;
};

export function useMarkAuthoring(options: {
  entries: OverlayEntry[];
  canMarkUp: boolean;
  color: string;
  addEntry: (entry: OverlayEntry) => void;
}): MarkAuthoring {
  const { entries, canMarkUp, color, addEntry } = options;

  const comment = useCallback(
    (anchor: TextAnchor, body: string, author: ReaderPresence) => {
      if (canMarkUp) {
        addEntry(
          newComment({ anchor, body, reader: author, ...paintFor(color) }),
        );
      }
    },
    [addEntry, canMarkUp, color],
  );

  const reply = useCallback(
    (parentId: string, body: string, author: ReaderPresence) => {
      const parent = entries.find((entry) => entry.id === parentId);
      if (parent === undefined || !canMarkUp) {
        return;
      }
      addEntry(
        newReply({
          parentId,
          anchor: parent.anchor,
          body,
          reader: author,
          color: parent.color,
          fill: parent.fill,
        }),
      );
    },
    [addEntry, canMarkUp, entries],
  );

  return { comment, reply };
}
