import { Button } from "@/components/ui/button";
import { copyLabel, useCopyToClipboard } from "@/hooks/useCopyToClipboard";

export function CopyLinkButton() {
  const clipboard = useCopyToClipboard();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Copy link"
      onClick={() => clipboard.copy(window.location.href)}
    >
      {copyLabel(clipboard.state)}
    </Button>
  );
}
