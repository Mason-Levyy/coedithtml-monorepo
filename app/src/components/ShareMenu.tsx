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
import type { LinkPermission } from "@/lib/link-permission";

const NOTHING_TO_COPY = "No feedback to copy yet.";

const PERMISSION_ORDER: LinkPermission[] = ["view", "suggest", "edit"];

const PERMISSION_LABEL: Record<LinkPermission, string> = {
  view: "View",
  suggest: "Suggest",
  edit: "Edit",
};

type ShareMenuProps = {
  feedback: string;
  artifactUrl: string;
  shareLinks: Partial<Record<LinkPermission, string>>;
};

export function ShareMenu({
  feedback,
  artifactUrl,
  shareLinks,
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<DownloadChoice>("edits");
  const link = useCopyToClipboard();
  const notes = useCopyToClipboard();
  const hasFeedback = feedback.length > 0;

  const available = PERMISSION_ORDER.filter(
    (kind) => shareLinks[kind] !== undefined,
  );
  const ownPermission = available.at(-1) ?? "view";
  const [permission, setPermission] = useState<LinkPermission>(ownPermission);
  const linkUrl = shareLinks[permission] ?? shareLinks[ownPermission];

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      className="w-72"
      trigger={(props) => (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 rounded-sm text-foreground hover:bg-paper/80 hover:text-foreground transition-colors"
          aria-label="Share"
          title="Share"
          {...props}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </Button>
      )}
    >
      <div className="flex items-center gap-2">
        {available.length > 1 && (
          <select
            aria-label="Link permission"
            value={permission}
            onChange={(event) =>
              setPermission(event.target.value as LinkPermission)
            }
            className="h-8 border border-line bg-paper-2 px-1.5 font-mono text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {available.map((kind) => (
              <option key={kind} value={kind}>
                {PERMISSION_LABEL[kind]}
              </option>
            ))}
          </select>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 justify-start"
          disabled={linkUrl === undefined}
          onClick={() => linkUrl !== undefined && link.copy(linkUrl)}
        >
          {copyLabel(link.state)}
        </Button>
      </div>
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
