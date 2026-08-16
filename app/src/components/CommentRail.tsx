import { ChangeLog } from "@/components/ChangeLog";
import { CommentComposer } from "@/components/CommentComposer";
import { CommentThread } from "@/components/CommentThread";
import { Button } from "@/components/ui/button";
import type { MarkPlacement } from "@/hooks/useArtifactBridge";
import type { DocRoom } from "@/hooks/useDocRoom";
import type { ReaderIdentity } from "@/hooks/useReaderIdentity";
import { placementOf } from "@/lib/mark-placement";
import {
  editsAmong,
  repliesTo,
  threadsIn,
  type RejectionReason,
  type TextAnchor,
} from "@/lib/protocol";

const REJECTION_LABEL: Record<RejectionReason, string> = {
  "read-only": "This link can read comments but not write them.",
  malformed: "That change could not be applied.",
  "unknown-entry": "That comment is no longer here.",
  "limit-reached": "This artifact has all the comments it can hold.",
  "too-long": "That comment is too long.",
  "not-editable": "This link can mark the file up but not change its text.",
  stale: "Someone else changed that text while you were typing.",
};

type CommentRailProps = {
  room: DocRoom;
  identity: ReaderIdentity;
  composing: TextAnchor | null;
  activeMarkId: string | null;
  marks: MarkPlacement;
  replacingMarkId: string | null;
  onActivate: (markId: string) => void;
  onReveal: (markId: string) => void;
  onReplace: (markId: string) => void;
  onComment: (body: string, displayName: string | null) => void;
  onReply: (parentId: string, body: string, displayName: string | null) => void;
  onDismissSelection: () => void;
  onClose: () => void;
};

export function CommentRail({
  room,
  identity,
  composing,
  activeMarkId,
  marks,
  replacingMarkId,
  onActivate,
  onReveal,
  onReplace,
  onComment,
  onReply,
  onDismissSelection,
  onClose,
}: CommentRailProps) {
  const threads = threadsIn(room.entries);
  const changes = editsAmong(room.entries);
  const others = room.readers.filter(
    (reader) => reader.id !== identity.reader.id,
  );
  const canMarkUp = room.canWrite;
  const needsName = room.canWrite && !identity.named;

  return (
    <aside
      aria-label="Comments"
      className="flex h-full w-[min(20rem,100vw)] flex-none flex-col border-l border-line bg-paper"
    >
      <header className="flex h-10 items-center justify-between border-b border-line px-3 pt-0.5">
        {others.length > 0 ? (
          <span className="truncate font-mono text-[10px] text-muted-foreground uppercase">
            {others.length} other {others.length === 1 ? "reader" : "readers"}{" "}
            here
          </span>
        ) : (
          <span />
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label="Close comments"
          title="Close comments"
          className="size-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          ✕
        </Button>
      </header>

      {room.rejection !== null && (
        <div className="mx-3 mt-2.5 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-900 shadow-xs backdrop-blur-md dark:border-red-400/30 dark:bg-red-500/20 dark:text-red-200">
          <span className="mt-0.5 flex size-3.5 flex-none items-center justify-center rounded-full bg-red-600/20 font-mono text-[9px] font-bold text-red-900 dark:text-red-200">
            !
          </span>
          <span className="min-w-0 flex-1 leading-snug">
            {REJECTION_LABEL[room.rejection] ?? "That change was not accepted."}
          </span>
          <button
            type="button"
            aria-label="Dismiss warning"
            title="Dismiss warning"
            onClick={room.dismissRejection}
            className="-mr-1 -my-0.5 flex size-5 flex-none items-center justify-center rounded text-xs text-red-900/80 hover:bg-red-500/20 hover:text-red-950 dark:text-red-200/80 dark:hover:text-red-100 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {composing !== null && canMarkUp && (
          <CommentComposer
            anchor={composing}
            needsName={needsName}
            onSubmit={onComment}
            onDismiss={onDismissSelection}
          />
        )}

        {threads.length === 0 && changes.length === 0 && composing === null && (
          <p className="text-sm text-muted-foreground">
            {canMarkUp
              ? "Select text in the artifact to comment on it, or drag a sticky onto the page."
              : "No comments yet."}
          </p>
        )}

        {threads.map((entry) => (
          <CommentThread
            key={entry.id}
            entry={entry}
            replies={repliesTo(room.entries, entry.id)}
            canWrite={canMarkUp}
            needsName={needsName}
            active={entry.id === activeMarkId}
            placement={placementOf(marks, entry.id)}
            replacing={entry.id === replacingMarkId}
            onActivate={() => onActivate(entry.id)}
            onReveal={() => onReveal(entry.id)}
            onReplace={() => onReplace(entry.id)}
            onReply={(body, displayName) =>
              onReply(entry.id, body, displayName)
            }
            onResolve={(resolved) =>
              room.patchEntry(entry.id, {
                status: resolved ? "resolved" : "open",
              })
            }
            onRemove={() => room.removeEntry(entry.id)}
          />
        ))}

        <ChangeLog edits={changes} onReveal={onReveal} />
      </div>
    </aside>
  );
}
