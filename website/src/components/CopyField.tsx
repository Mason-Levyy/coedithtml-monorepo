"use client";

import { useEffect, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

const BUTTON_LABEL: Record<CopyState, string> = {
  idle: "Copy",
  copied: "Copied",
  failed: "Copy it by hand",
};

type CopyFieldProps = {
  label: string;
  value: string;
  block?: boolean;
};

export function CopyField({ label, value, block = false }: CopyFieldProps) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") {
      return;
    }
    const timer = window.setTimeout(() => setState("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className={block ? "copy-field copy-field--block" : "copy-field"}>
      <span className="copy-field__label">{label}</span>
      <code className="copy-field__value">{value}</code>
      <button
        type="button"
        className="btn btn--small"
        onClick={() => void copy()}
      >
        {BUTTON_LABEL[state]}
      </button>
      <span role="status" className="copy-field__status">
        {state === "copied" ? `${label} copied to your clipboard` : ""}
      </span>
    </div>
  );
}
