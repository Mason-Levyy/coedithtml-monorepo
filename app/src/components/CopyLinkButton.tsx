import { Button } from "@/components/ui/button";
import { copyLabel, useCopyToClipboard } from "@/hooks/useCopyToClipboard";

export function CopyLinkButton() {
  const clipboard = useCopyToClipboard();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      // The label reports the outcome, so the name has to stay put for a reader.
      aria-label="Copy link"
      onClick={() => clipboard.copy(window.location.href)}
    >
      {copyLabel(clipboard.state)}
    </Button>
  );
}
