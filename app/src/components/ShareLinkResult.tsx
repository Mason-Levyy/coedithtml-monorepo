import { Button } from "@/components/ui/button";
import { copyLabel, useCopyToClipboard } from "@/hooks/useCopyToClipboard";

type LinkPermission = "view" | "suggest" | "edit";

type ShareLinkResultProps = {
  shareUrl: string;
  permission: LinkPermission;
  onUploadAnother: () => void;
};

const PERMISSION_DESCRIPTION: Record<LinkPermission, string> = {
  view: "Anyone with this link can read the file, but not comment or edit it.",
  suggest: "Anyone with this link can comment and mark it up.",
  edit: "Anyone with this link can comment and mark it up.",
};

export function ShareLinkResult({
  shareUrl,
  permission,
  onUploadAnother,
}: ShareLinkResultProps) {
  const clipboard = useCopyToClipboard();

  function handleOpenLink() {
    window.open(shareUrl, "_blank");
  }

  return (
    <div className="flex flex-col gap-3 border-2 border-ink bg-card p-6">
      <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
        Your link is ready
      </span>
      <div className="flex items-center gap-2 border border-line bg-paper-2 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
          {shareUrl}
        </span>
        <Button
          type="button"
          size="sm"
          onClick={() => clipboard.copy(shareUrl)}
        >
          {copyLabel(clipboard.state)}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {PERMISSION_DESCRIPTION[permission]}
      </p>
      <div className="flex w-full items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={onUploadAnother}>
          Upload another
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenLink}
          className="ml-auto"
        >
          Open file
        </Button>
      </div>
    </div>
  );
}
