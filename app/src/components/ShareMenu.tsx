import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { copyLabel, useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
  AI_TOOL_LABEL,
  AI_TOOLS,
  handoffFor,
  PROMPT_BASE_URL,
  type AiTool,
} from "@/lib/ai-handoff";
import {
  DOWNLOAD_CHOICES,
  DOWNLOAD_LABEL,
  DOWNLOAD_NOTE,
  downloadUrlFor,
  type DownloadChoice,
} from "@/lib/download-artifact";
import { LINK_PERMISSIONS, type LinkPermission } from "@/lib/link-permission";

const NOTHING_TO_COPY = "No changes to send yet.";

const SENDS_THE_CHANGES =
  "Opens a new chat with the comments, notes, and edits people left, and asks for exactly those changes.";

const LAST_TOOL_KEY = "coedit:ai-tool";

function rememberedTool(): AiTool {
  const stored = window.localStorage.getItem(LAST_TOOL_KEY);
  return AI_TOOLS.find((known) => known === stored) ?? "claude";
}

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
  const [tool, setTool] = useState<AiTool>(rememberedTool);
  const [handedOff, setHandedOff] = useState(false);
  const link = useCopyToClipboard();
  const notes = useCopyToClipboard();
  const hasFeedback = feedback.length > 0;

  function handOff(): void {
    window.localStorage.setItem(LAST_TOOL_KEY, tool);
    const handoff = handoffFor({ tool, feedback });
    if (handoff.kind === "open") {
      setHandedOff(false);
      window.open(handoff.url, "_blank", "noopener,noreferrer");
      return;
    }
    notes.copy(handoff.prompt);
    setHandedOff(true);
    window.open(PROMPT_BASE_URL[tool], "_blank", "noopener,noreferrer");
  }

  const available = LINK_PERMISSIONS.filter(
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
      <div className="mt-1 flex flex-col gap-1.5 border-t border-line pt-2">
        <label
          htmlFor="ai-tool"
          className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase"
        >
          Make changes with
        </label>
        <div className="flex items-center gap-2">
          <select
            id="ai-tool"
            value={tool}
            onChange={(event) => setTool(event.target.value as AiTool)}
            className="h-8 border border-line bg-paper-2 px-1.5 font-mono text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {AI_TOOLS.map((option) => (
              <option key={option} value={option}>
                {AI_TOOL_LABEL[option]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 justify-start"
            disabled={!hasFeedback}
            onClick={handOff}
          >
            {handedOff
              ? "Copied — paste it in"
              : copyLabel(notes.state, `Open ${AI_TOOL_LABEL[tool]}`)}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {hasFeedback ? SENDS_THE_CHANGES : NOTHING_TO_COPY}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-start"
          disabled={!hasFeedback}
          onClick={() => notes.copy(feedback)}
        >
          {copyLabel(notes.state, "Copy the changes instead")}
        </Button>
      </div>

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
