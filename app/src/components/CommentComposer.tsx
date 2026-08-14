import { useEffect, useRef, useState } from "react";
import { AuthorNameField } from "@/components/AuthorNameField";
import { Button } from "@/components/ui/button";
import type { TextAnchor } from "@/lib/protocol";

type CommentComposerProps = {
  anchor: TextAnchor;
  needsName: boolean;
  onSubmit: (body: string, displayName: string | null) => void;
  onDismiss: () => void;
};

export function CommentComposer({
  anchor,
  needsName,
  onSubmit,
  onDismiss,
}: CommentComposerProps) {
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    field.current?.focus();
  }, [anchor.quote]);

  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const ready =
    body.trim().length > 0 && (!needsName || name.trim().length > 0);

  function send(): void {
    if (ready) {
      onSubmit(body.trim(), needsName ? name.trim() : null);
      setBody("");
    }
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-line bg-card p-3 shadow-xs"
      onSubmit={(event) => {
        event.preventDefault();
        send();
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
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            send();
          }
        }}
        rows={3}
        placeholder="What should change here?"
        aria-label="Comment"
        className="resize-none rounded-md border border-line bg-paper-2 p-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring"
      />
      {needsName && <AuthorNameField value={name} onChange={setName} />}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!ready}>
          Comment
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
