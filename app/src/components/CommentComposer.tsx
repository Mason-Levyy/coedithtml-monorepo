import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MarkColorPicker } from "@/components/MarkColorPicker";
import {
  DEFAULT_MARK_COLOR,
  type MarkColor,
  type TextAnchor,
} from "@/lib/protocol";

export type ComposedMark = { body: string; color: MarkColor };

type CommentComposerProps = {
  anchor: TextAnchor;
  onSubmit: (mark: ComposedMark) => void;
  onDismiss: () => void;
};

export function CommentComposer({
  anchor,
  onSubmit,
  onDismiss,
}: CommentComposerProps) {
  const [body, setBody] = useState("");
  const [color, setColor] = useState<MarkColor>(DEFAULT_MARK_COLOR);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    field.current?.focus();
  }, [anchor.quote]);

  const ready = body.trim().length > 0;

  return (
    <form
      className="flex flex-col gap-2 border-2 border-ink bg-card p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) {
          onSubmit({ body: body.trim(), color });
          setBody("");
        }
      }}
    >
      <blockquote className="border-l-2 border-ink-soft pl-2 text-xs text-muted-foreground italic">
        {anchor.quote}
      </blockquote>
      <textarea
        ref={field}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onDismiss();
          }
        }}
        rows={3}
        placeholder="What should change here?"
        aria-label="Comment"
        className="resize-none border-2 border-line bg-paper-2 p-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
      />
      <div className="flex items-center gap-2">
        <MarkColorPicker value={color} onChange={setColor} />
        <Button type="submit" size="sm" className="ml-auto" disabled={!ready}>
          Comment
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
