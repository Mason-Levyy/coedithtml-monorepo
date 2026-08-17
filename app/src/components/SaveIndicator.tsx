import { useEffect, useState } from "react";
import type { SaveState } from "@/lib/room-state";

const SETTLED_MS = 2500;

const LABEL: Record<Exclude<SaveState, "idle">, string> = {
  saving: "Saving…",
  saved: "Saved",
  failed: "Not saved",
};

type SaveIndicatorProps = {
  state: SaveState;
};

export function SaveIndicator({ state }: SaveIndicatorProps) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (state !== "saved") {
      setSettled(false);
      return;
    }
    const timer = setTimeout(() => setSettled(true), SETTLED_MS);
    return () => clearTimeout(timer);
  }, [state]);

  if (state === "idle" || (state === "saved" && settled)) {
    return null;
  }

  return (
    <span
      role="status"
      title={
        state === "failed"
          ? "The room never confirmed the last change. Check your connection."
          : undefined
      }
      className={`flex-none font-mono text-[10px] tracking-wide uppercase ${
        state === "failed"
          ? "text-red-700 dark:text-red-300"
          : "text-muted-foreground"
      }`}
    >
      {LABEL[state]}
    </span>
  );
}
