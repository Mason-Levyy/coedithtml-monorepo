import { useEffect, useState } from "react";
import { MarkColorPicker } from "@/components/MarkColorPicker";
import { Button } from "@/components/ui/button";
import type { EntryPatch, StickyEntry } from "@/lib/protocol";

type StickyPropertiesProps = {
  entry: StickyEntry;
  onPatch: (patch: EntryPatch) => void;
  onRemove: () => void;
};

export function StickyProperties({
  entry,
  onPatch,
  onRemove,
}: StickyPropertiesProps) {
  const [draft, setDraft] = useState(entry.body);

  // Keyed on the id, not the body: retyping here must not fight the room.
  useEffect(() => {
    setDraft(entry.body);
  }, [entry.id]);

  const changed = draft !== entry.body;

  return (
    <section
      aria-label="Sticky"
      className="flex flex-col gap-2 border-2 border-ink bg-card p-3"
    >
      <h3 className="font-mono text-[10px] tracking-wide uppercase">Sticky</h3>
      <MarkColorPicker
        value={{ color: entry.color, fill: entry.fill }}
        onChange={(paint) => onPatch(paint)}
      />
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => changed && onPatch({ body: draft })}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setDraft(entry.body);
          }
        }}
        rows={3}
        aria-label="Sticky text"
        className="resize-none border-2 border-line bg-paper-2 p-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!changed}
          onClick={() => onPatch({ body: draft })}
        >
          Save text
        </Button>
        {(entry.width !== null || entry.height !== null) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onPatch({ width: null, height: null })}
          >
            Fit to text
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto text-destructive"
          onClick={onRemove}
        >
          Delete
        </Button>
      </div>
    </section>
  );
}
