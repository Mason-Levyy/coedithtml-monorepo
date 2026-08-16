import { Button } from "@/components/ui/button";
import { copyLabel, useCopyToClipboard } from "@/hooks/useCopyToClipboard";

type ArtifactLinkRowProps = {
  label: string;
  url?: string;
  isRegenerating: boolean;
  onRegenerate: () => void;
  onRevoke: () => void;
};

export function ArtifactLinkRow({
  label,
  url,
  isRegenerating,
  onRegenerate,
  onRevoke,
}: ArtifactLinkRowProps) {
  const clipboard = useCopyToClipboard();

  return (
    <div className="flex items-center justify-between gap-2 rounded border border-line bg-paper-2 px-3 py-1.5 text-xs">
      <div className="flex min-w-0 flex-col">
        <span className="font-mono text-muted-foreground">{label}</span>
        {!url && (
          <span className="text-[11px] text-muted-foreground/70">
            Not generated
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {url && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => clipboard.copy(url)}
          >
            {copyLabel(clipboard.state, "Copy")}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRegenerating}
          onClick={onRegenerate}
        >
          {isRegenerating ? "Working…" : url ? "Regenerate" : "Generate"}
        </Button>
        {url && (
          <Button type="button" variant="outline" size="sm" onClick={onRevoke}>
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
}
