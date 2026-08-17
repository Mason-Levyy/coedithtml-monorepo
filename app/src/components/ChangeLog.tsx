import type { EditEntry } from "@/lib/protocol";

type ChangeLogProps = {
  edits: EditEntry[];
  canEdit: boolean;
  onReveal: (markId: string) => void;
  onRemove: (markId: string) => void;
};

function speakerOf(edit: EditEntry): string {
  const named = edit.author.displayName.trim();
  return named.length > 0 ? named : "Someone";
}

function originalOf(edit: EditEntry): string | null {
  return edit.anchor.kind === "text" ? edit.anchor.quote : null;
}

export function ChangeLog({
  edits,
  canEdit,
  onReveal,
  onRemove,
}: ChangeLogProps) {
  if (edits.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col">
      {edits.map((edit) => (
        <li key={edit.id} className="flex items-baseline gap-1">
          <button
            type="button"
            onClick={() => onReveal(edit.id)}
            className="flex min-w-0 flex-1 items-baseline gap-2 px-1 py-1 text-left text-xs hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="flex-none font-mono text-[10px] text-muted-foreground uppercase">
              {speakerOf(edit)}
            </span>
            <span className="truncate text-foreground">
              &ldquo;{edit.body.trim()}&rdquo;
            </span>
          </button>
          {canEdit && (
            <button
              type="button"
              aria-label={`Put back “${originalOf(edit) ?? edit.body.trim()}”`}
              title="Put the original words back"
              onClick={() => onRemove(edit.id)}
              className="flex-none cursor-pointer rounded px-1.5 py-1 font-mono text-[10px] text-muted-foreground uppercase transition-colors hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Put back
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
