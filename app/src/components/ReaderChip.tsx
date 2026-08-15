import { useState } from "react";
import { getNatureIcon } from "@/components/nature-icons";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
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
  const NatureIcon = getNatureIcon(
    identity.reader.id || identity.reader.displayName,
  );

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      align="end"
      className="w-64"
      trigger={(props) => (
        <button
          type="button"
          aria-label="Your name and colour"
          title={
            identity.named
              ? identity.reader.displayName
              : "Your name and colour"
          }
          className="flex size-8 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          {...props}
        >
          <span
            className="flex size-8 flex-none items-center justify-center rounded-full text-ink transition-colors"
            style={{
              backgroundColor: `${identity.color}33`,
            }}
          >
            <NatureIcon className="size-4 text-ink" />
          </span>
          <span className="sr-only">
            {identity.named ? identity.reader.displayName : "Add your name"}
          </span>
        </button>
      )}
    >
      <IdentityPanel identity={identity} />
    </Popover>
  );
}

function IdentityPanel({ identity }: { identity: ReaderIdentity }) {
  const [draft, setDraft] = useState(identity.reader.displayName);
  const changed = draft.trim() !== identity.reader.displayName;

  return (
    <>
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
          className="min-w-0 flex-1 rounded-md border border-line bg-paper px-2.5 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring"
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
              "size-5 rounded-xs border transition-transform hover:scale-110 cursor-pointer",
              swatch === identity.color
                ? "border-ink ring-1 ring-ink"
                : "border-line",
            )}
            style={{ background: swatch }}
          />
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">{COLOUR_HINT}</p>
    </>
  );
}
