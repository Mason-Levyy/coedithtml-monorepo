import { useCallback, useEffect, useMemo, useState } from "react";
import { readerColorFor } from "@/lib/palette";
import { normalizeHex, type ReaderPresence } from "@/lib/protocol";

const STORAGE_KEY = "coedit:reader";

type StoredReader = ReaderPresence & { color: string };

function newReaderId(): string {
  return crypto.randomUUID();
}

function readStored(): StoredReader | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const { id, displayName, color } = parsed as Record<string, unknown>;
    if (typeof id !== "string" || typeof displayName !== "string") {
      return null;
    }
    return {
      id,
      displayName,
      color: normalizeHex(color) ?? readerColorFor(id),
    };
  } catch {
    return null;
  }
}

function writeStored(reader: StoredReader): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reader));
  } catch {
    // A reader with storage blocked still gets to comment, just not by name.
  }
}

export type ReaderIdentity = {
  reader: ReaderPresence;
  color: string;
  named: boolean;
  // The new name is unreadable from state this tick, so it is handed back.
  rename: (displayName: string) => ReaderPresence;
  recolor: (color: string) => void;
};

function firstVisit(): StoredReader {
  const id = newReaderId();
  return { id, displayName: "", color: readerColorFor(id) };
}

export function useReaderIdentity(): ReaderIdentity {
  const [stored, setStored] = useState<StoredReader>(
    () => readStored() ?? firstVisit(),
  );

  // Written before naming too, or a reload makes a reader a second person.
  useEffect(() => {
    writeStored(stored);
  }, [stored]);

  const readerId = stored.id;
  const rename = useCallback(
    (displayName: string): ReaderPresence => {
      const named = displayName.trim();
      setStored((previous) => ({ ...previous, displayName: named }));
      return { id: readerId, displayName: named };
    },
    [readerId],
  );

  const recolor = useCallback((color: string) => {
    const fill = normalizeHex(color);
    if (fill !== null) {
      setStored((previous) => ({ ...previous, color: fill }));
    }
  }, []);

  // Split out so a colour change alone does not re-announce the reader.
  const reader = useMemo(
    () => ({ id: stored.id, displayName: stored.displayName }),
    [stored.id, stored.displayName],
  );

  return {
    reader,
    color: stored.color,
    named: stored.displayName.length > 0,
    rename,
    recolor,
  };
}
