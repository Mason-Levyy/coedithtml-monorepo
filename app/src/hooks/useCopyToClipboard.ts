import { useEffect, useState } from "react";

export type CopyState = "idle" | "copied" | "failed";

const SETTLED_LABEL: Record<Exclude<CopyState, "idle">, string> = {
  copied: "Copied",
  failed: "Press Ctrl+C",
};

const RESET_AFTER_MS = 2000;

export function copyLabel(state: CopyState, idleLabel = "Copy link"): string {
  return state === "idle" ? idleLabel : SETTLED_LABEL[state];
}

export function useCopyToClipboard(): {
  state: CopyState;
  copy: (text: string) => void;
} {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") {
      return;
    }
    const timer = window.setTimeout(() => setState("idle"), RESET_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function write(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return { state, copy: (text: string) => void write(text) };
}
