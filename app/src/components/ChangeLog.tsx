import type { EditEntry } from "@/lib/protocol";

type ChangeLogProps = {
  edits: EditEntry[];
  onReveal: (markId: string) => void;
};

function speakerOf(edit: EditEntry): string {
  const named = edit.author.displayName.trim();
  return named.length > 0 ? named : "Someone";
}

export function ChangeLog({ edits, onReveal }: ChangeLogProps) {
  if (edits.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-1 border-t-2 border-ink pt-3">
      <h2 className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
        Changes · {edits.length}
      </h2>
      <ul className="flex flex-col">
        {edits.map((edit) => (
          <li key={edit.id}>
            <button
              type="button"
              onClick={() => onReveal(edit.id)}
              className="flex w-full items-baseline gap-2 px-1 py-1 text-left text-xs hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex-none font-mono text-[10px] text-muted-foreground uppercase">
                {speakerOf(edit)}
              </span>
              <span className="truncate text-foreground">
                &ldquo;{edit.body.trim()}&rdquo;
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
