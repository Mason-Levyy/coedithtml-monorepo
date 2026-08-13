import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDismissOnOutside } from "@/hooks/useDismissOnOutside";
import type { ReaderIdentity } from "@/hooks/useReaderIdentity";
import { PALETTE_COLUMNS, READER_PALETTE } from "@/lib/palette";
import { cn } from "@/lib/utils";

const COLOUR_HINT = "Everything you leave is marked in this colour.";

type ReaderChipProps = {
  identity: ReaderIdentity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReaderChip({ identity, open, onOpenChange }: ReaderChipProps) {
  const wrapper = useDismissOnOutside(open, () => onOpenChange(false));

  return (
    <div ref={wrapper} className="relative flex-none">
      <button
        type="button"
        aria-label="Your name and colour"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex h-8 max-w-40 items-center gap-2 border-2 border-ink bg-card px-2 font-mono text-xs tracking-wide uppercase hover:bg-paper focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span
          className="size-3 flex-none border border-ink"
          style={{ background: identity.color }}
        />
        <span className="truncate">
          {identity.named ? identity.reader.displayName : "Add your name"}
        </span>
      </button>

      {open && <IdentityPanel identity={identity} />}
    </div>
  );
}

function IdentityPanel({ identity }: { identity: ReaderIdentity }) {
  const [draft, setDraft] = useState(identity.reader.displayName);
  const changed = draft.trim() !== identity.reader.displayName;

  return (
    <div className="absolute top-full left-0 z-30 mt-1 flex w-64 flex-col gap-2 border-2 border-ink bg-paper-2 p-2 shadow-lg">
      {!identity.named && (
        <p className="text-[11px]">
          Put your name in to comment. Everyone here will see it against what
          you leave.
        </p>
      )}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          identity.rename(draft);
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => changed && identity.rename(draft)}
          placeholder="Your name"
          aria-label="Your name"
          className="min-w-0 flex-1 border-2 border-line bg-paper px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring"
        />
        {changed && (
          <Button type="submit" size="sm" variant="outline">
            Save
          </Button>
        )}
      </form>

      <div
        role="group"
        aria-label="Pick your colour"
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${PALETTE_COLUMNS}, minmax(0, 1fr))`,
        }}
      >
        {READER_PALETTE.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={swatch}
            aria-pressed={swatch === identity.color}
            onClick={() => identity.recolor(swatch)}
            className={cn(
              "size-5 border transition-transform hover:scale-110",
              swatch === identity.color
                ? "border-ink ring-1 ring-ink"
                : "border-line",
            )}
            style={{ background: swatch }}
          />
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">{COLOUR_HINT}</p>
    </div>
  );
}
