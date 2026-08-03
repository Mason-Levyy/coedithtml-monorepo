import { useState } from "react";
import { Button } from "@/components/ui/button";

type ShareLinkResultProps = {
  viewUrl: string;
  onUploadAnother: () => void;
};

export function ShareLinkResult({
  viewUrl,
  onUploadAnother,
}: ShareLinkResultProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(viewUrl);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-3 border-2 border-ink bg-card p-6">
      <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
        Your link is ready
      </span>
      <div className="flex items-center gap-2 border border-line bg-paper-2 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
          {viewUrl}
        </span>
        <Button type="button" size="sm" onClick={() => void handleCopy()}>
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      <div>
        <Button type="button" variant="outline" onClick={onUploadAnother}>
          Upload another
        </Button>
      </div>
    </div>
  );
}
