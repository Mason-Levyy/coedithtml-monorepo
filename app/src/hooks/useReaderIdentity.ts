import { useCallback, useState } from "react";
import type { ReaderPresence } from "@/lib/protocol";

const STORAGE_KEY = "coedit:reader";

function newReaderId(): string {
  return crypto.randomUUID();
}

function readStored(): ReaderPresence | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const { id, displayName } = parsed as Record<string, unknown>;
    if (typeof id !== "string" || typeof displayName !== "string") {
      return null;
    }
    return { id, displayName };
  } catch {
    return null;
  }
}

function writeStored(reader: ReaderPresence): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reader));
  } catch {
    // A reader with storage blocked still gets to comment, just not by name.
  }
}

export type ReaderIdentity = {
  reader: ReaderPresence;
  named: boolean;
  rename: (displayName: string) => void;
};

export function useReaderIdentity(): ReaderIdentity {
  const [reader, setReader] = useState<ReaderPresence>(
    () => readStored() ?? { id: newReaderId(), displayName: "" },
  );

  const rename = useCallback((displayName: string) => {
    setReader((previous) => {
      const next = { ...previous, displayName: displayName.trim() };
      writeStored(next);
      return next;
    });
  }, []);

  return { reader, named: reader.displayName.length > 0, rename };
}
