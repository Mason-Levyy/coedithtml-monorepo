import { Button } from "@/components/ui/button";
import { copyLabel, useCopyToClipboard } from "@/hooks/useCopyToClipboard";

type ShareBarProps = {
  title: string;
  fileName: string;
};

export function ShareBar({ title, fileName }: ShareBarProps) {
  const clipboard = useCopyToClipboard();

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
        onClick={() => clipboard.copy(window.location.href)}
      >
        {copyLabel(clipboard.state)}
      </Button>
    </div>
  );
}
