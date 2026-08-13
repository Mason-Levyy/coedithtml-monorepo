import { useState } from "react";
import { AuthorNameField } from "@/components/AuthorNameField";
import { ThreadPlacement } from "@/components/ThreadPlacement";
import { Button } from "@/components/ui/button";
import type { MarkPlacementState } from "@/lib/mark-placement";
import {
  effectiveEdge,
  effectiveFill,
  type OverlayEntry,
  type ReplyEntry,
} from "@/lib/protocol";
import { cn } from "@/lib/utils";

function displayNameOf(entry: OverlayEntry): string {
  return entry.author.displayName.length > 0
    ? entry.author.displayName
    : "Someone";
}

function quoteOf(entry: OverlayEntry): string | null {
  return entry.anchor.kind === "text" ? entry.anchor.quote : null;
}

type CommentThreadProps = {
  entry: OverlayEntry;
  replies: ReplyEntry[];
  canWrite: boolean;
  needsName: boolean;
  active: boolean;
  placement: MarkPlacementState;
  replacing: boolean;
  onActivate: () => void;
  onReveal: () => void;
  onReplace: () => void;
  onReply: (body: string, displayName: string | null) => void;
  onResolve: (resolved: boolean) => void;
  onRemove: () => void;
};

export function CommentThread({
  entry,
  replies,
  canWrite,
  needsName,
  active,
  placement,
  replacing,
  onActivate,
  onReveal,
  onReplace,
  onReply,
  onResolve,
  onRemove,
}: CommentThreadProps) {
  const [reply, setReply] = useState("");
  const [name, setName] = useState("");
  const resolved = entry.status === "resolved";
  const quote = quoteOf(entry);
  const ready =
    reply.trim().length > 0 && (!needsName || name.trim().length > 0);

  function send(): void {
    if (ready) {
      onReply(reply.trim(), needsName ? name.trim() : null);
      setReply("");
    }
  }

  return (
    <article
      onClick={onActivate}
      className={cn(
        "border-2 bg-card p-3 text-sm",
        active ? "border-ink" : "border-line",
        resolved && "opacity-60",
      )}
    >
      <header className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-3 flex-none border"
          style={{
            background: effectiveFill(entry),
            borderColor: effectiveEdge(entry),
          }}
        />
        <span className="truncate font-mono text-[10px] tracking-wide uppercase">
          {displayNameOf(entry)}
        </span>
        {entry.kind === "sticky" && (
          <span className="font-mono text-[10px] text-muted-foreground uppercase">
            sticky
          </span>
        )}
        {resolved && (
          <span className="font-mono text-[10px] text-muted-foreground uppercase">
            resolved
          </span>
        )}
      </header>

      {quote !== null && (
        <blockquote className="mt-2 border-l-2 border-ink-soft pl-2 text-xs text-muted-foreground italic">
          {quote}
        </blockquote>
      )}

      <ThreadPlacement
        state={placement}
        canReplace={canWrite && entry.kind === "sticky"}
        replacing={replacing}
        onReveal={onReveal}
        onReplace={onReplace}
      />

      <p className="mt-2 whitespace-pre-wrap">{entry.body}</p>

      {replies.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2 border-l-2 border-line pl-3">
          {replies.map((child) => (
            <li key={child.id}>
              <p className="font-mono text-[10px] tracking-wide uppercase">
                {displayNameOf(child)}
              </p>
              <p className="whitespace-pre-wrap">{child.body}</p>
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <div className="mt-3 flex flex-col gap-2">
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <div className="flex gap-2">
              <input
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Reply"
                aria-label={`Reply to ${displayNameOf(entry)}`}
                className="min-w-0 flex-1 border-2 border-line bg-paper-2 px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={!ready}
              >
                Send
              </Button>
            </div>
            {needsName && reply.length > 0 && (
              <AuthorNameField value={name} onChange={setName} />
            )}
          </form>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onResolve(!resolved)}
            >
              {resolved ? "Reopen" : "Resolve"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={onRemove}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
