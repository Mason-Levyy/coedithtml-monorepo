import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { copyLabel, useCopyToClipboard } from "@/hooks/useCopyToClipboard";

const NOTHING_TO_COPY = "No feedback to copy yet.";

type ShareMenuProps = {
  feedback: string;
};

export function ShareMenu({ feedback }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const link = useCopyToClipboard();
  const notes = useCopyToClipboard();
  const hasFeedback = feedback.length > 0;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      className="w-60"
      trigger={(props) => (
        <Button type="button" variant="ghost" size="sm" {...props}>
          Share
        </Button>
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-start"
        onClick={() => link.copy(window.location.href)}
      >
        {copyLabel(link.state)}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-start"
        disabled={!hasFeedback}
        onClick={() => notes.copy(feedback)}
      >
        {copyLabel(notes.state, "Copy feedback for AI tool")}
      </Button>
      {!hasFeedback && (
        <p className="text-[11px] text-muted-foreground">{NOTHING_TO_COPY}</p>
      )}
    </Popover>
  );
}
