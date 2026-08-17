import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
      <div className="flex items-center gap-2">
        <Select
          label="What to download"
          value={choice}
          options={DOWNLOAD_CHOICES}
          labelFor={DOWNLOAD_LABEL}
          onChange={setChoice}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 justify-start"
          onClick={() => {
            window.location.href = downloadUrlFor(artifactUrl, choice);
          }}
        >
          Download
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {DOWNLOAD_NOTE[choice]}
      </p>
    </div>
  );
}
