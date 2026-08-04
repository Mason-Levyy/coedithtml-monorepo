import { useState } from "react";
import { Button } from "@/components/ui/button";

type ShareBarProps = {
  title: string;
  fileName: string;
};

export function ShareBar({ title, fileName }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  return (
    <div className="flex items-center gap-3 border-b-2 border-ink bg-card px-3 py-1.5">
      <span className="truncate text-sm font-semibold text-foreground">
        {title}
      </span>
      {title !== fileName && (
        <span className="hidden truncate font-mono text-[10px] tracking-wide text-muted-foreground uppercase sm:inline">
          {fileName}
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-auto flex-none"
        onClick={() => void handleCopy()}
      >
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
