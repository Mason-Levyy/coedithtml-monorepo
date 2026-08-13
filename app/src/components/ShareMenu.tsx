import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { copyLabel, useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
  DOWNLOAD_CHOICES,
  DOWNLOAD_LABEL,
  DOWNLOAD_NOTE,
  downloadUrlFor,
  type DownloadChoice,
} from "@/lib/download-artifact";

const NOTHING_TO_COPY = "No feedback to copy yet.";

type ShareMenuProps = {
  feedback: string;
  artifactUrl: string;
};

export function ShareMenu({ feedback, artifactUrl }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<DownloadChoice>("edits");
  const link = useCopyToClipboard();
  const notes = useCopyToClipboard();
  const hasFeedback = feedback.length > 0;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      className="w-72"
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

      <div className="mt-1 flex flex-col gap-1.5 border-t border-line pt-2">
        <label
          htmlFor="download-choice"
          className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase"
        >
          Download
        </label>
        <select
          id="download-choice"
          value={choice}
          onChange={(event) => setChoice(event.target.value as DownloadChoice)}
          className="border border-line bg-paper-2 px-2 py-1.5 font-mono text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {DOWNLOAD_CHOICES.map((option) => (
            <option key={option} value={option}>
              {DOWNLOAD_LABEL[option]}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          {DOWNLOAD_NOTE[choice]}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-start"
          onClick={() => {
            window.location.href = downloadUrlFor(artifactUrl, choice);
          }}
        >
          Download
        </Button>
      </div>
    </Popover>
  );
}
