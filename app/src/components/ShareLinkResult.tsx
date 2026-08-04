import { Button } from "@/components/ui/button";
import { copyLabel, useCopyToClipboard } from "@/hooks/useCopyToClipboard";

type ShareLinkResultProps = {
  viewUrl: string;
  onUploadAnother: () => void;
};

export function ShareLinkResult({
  viewUrl,
  onUploadAnother,
}: ShareLinkResultProps) {
  const clipboard = useCopyToClipboard();

  return (
    <div className="flex flex-col gap-3 border-2 border-ink bg-card p-6">
      <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
        Your link is ready
      </span>
      <div className="flex items-center gap-2 border border-line bg-paper-2 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
          {viewUrl}
        </span>
        <Button type="button" size="sm" onClick={() => clipboard.copy(viewUrl)}>
          {copyLabel(clipboard.state)}
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
