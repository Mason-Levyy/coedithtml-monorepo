import { useState } from "react";
import { DownloadControls } from "@/components/DownloadControls";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { copyLabel, useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
  AI_TOOL_LABEL,
  AI_TOOLS,
  handoffFor,
  PROMPT_BASE_URL,
  type AiTool,
} from "@/lib/ai-handoff";
import { withoutUnlockGrant } from "@/lib/artifact-src";
import {
  editTokenIn,
  LINK_PERMISSIONS,
  type LinkPermission,
} from "@/lib/link-permission";

const NOTHING_TO_SEND = "No changes to send yet.";

const SENDS_THE_CHANGES =
  "Opens a new chat asking for exactly these changes. With Coedit connected there, the rewrite publishes back to this link.";

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
  fileName: string;
  artifactUrl: string;
  canEdit: boolean;
  shareLinks: Partial<Record<LinkPermission, string>>;
};

export function ShareMenu({
  feedback,
  fileName,
  artifactUrl,
  canEdit,
  shareLinks,
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<AiTool>(rememberedTool);
  const [handedOff, setHandedOff] = useState(false);
  const link = useCopyToClipboard();
  const notes = useCopyToClipboard();
  const hasFeedback = feedback.length > 0;

  const editToken = editTokenIn(shareLinks);

  function handOff(): void {
    window.localStorage.setItem(LAST_TOOL_KEY, tool);
    const handoff = handoffFor({
      tool,
      feedback,
      connector:
        editToken === null
          ? null
          : {
              editToken,
              fileName,
              artifactUrl: withoutUnlockGrant(artifactUrl),
            },
    });
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
          <Select
            label="Link permission"
            value={permission}
            options={available}
            labelFor={PERMISSION_LABEL}
            onChange={setPermission}
          />
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

      {canEdit && (
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Select
              label="AI tool"
              value={tool}
              options={AI_TOOLS}
              labelFor={AI_TOOL_LABEL}
              onChange={setTool}
            />
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
                : copyLabel(notes.state, "Send changes")}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {hasFeedback ? SENDS_THE_CHANGES : NOTHING_TO_SEND}
          </p>
        </div>
      )}

      <DownloadControls
        artifactUrl={artifactUrl}
        className="mt-2 border-t border-line pt-2"
      />
    </Popover>
  );
}
