import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DOWNLOAD_CHOICES,
  DOWNLOAD_LABEL,
  DOWNLOAD_NOTE,
  downloadUrlFor,
  type DownloadChoice,
} from "@/lib/download-artifact";

type DownloadControlsProps = {
  artifactUrl: string;
  className?: string;
};

export function DownloadControls({
  artifactUrl,
  className = "",
}: DownloadControlsProps) {
  const [choice, setChoice] = useState<DownloadChoice>("edits");

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
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
  );
}
