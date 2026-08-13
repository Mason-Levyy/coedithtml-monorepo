import { CommentComposer } from "@/components/CommentComposer";
import { CommentThread } from "@/components/CommentThread";
import { Button } from "@/components/ui/button";
import type { MarkPlacement } from "@/hooks/useArtifactBridge";
import type { DocRoom } from "@/hooks/useDocRoom";
import type { ReaderIdentity } from "@/hooks/useReaderIdentity";
import { placementOf } from "@/lib/mark-placement";
import {
  repliesTo,
  threadsIn,
  type RejectionReason,
  type TextAnchor,
} from "@/lib/protocol";
import type { RoomStatus } from "@/lib/room-socket";

const STATUS_LABEL: Record<RoomStatus, string> = {
  connecting: "Connecting…",
  open: "Live",
  closed: "Reconnecting…",
};

const REJECTION_LABEL: Record<RejectionReason, string> = {
  "read-only": "This link can read comments but not write them.",
  malformed: "That change could not be applied.",
  "unknown-entry": "That comment is no longer here.",
  "limit-reached": "This artifact has all the comments it can hold.",
  "too-long": "That comment is too long.",
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
  const others = room.readers.filter(
    (reader) => reader.id !== identity.reader.id,
  );
  const canMarkUp = room.canWrite;
  const needsName = room.canWrite && !identity.named;

  return (
    <aside
      aria-label="Comments"
      className="flex h-full w-[min(20rem,100vw)] flex-none flex-col border-l-2 border-ink bg-paper"
    >
      <header className="flex items-center gap-2 border-b-2 border-ink px-3 py-2">
        <span className="font-mono text-[10px] text-muted-foreground uppercase">
          {STATUS_LABEL[room.status]}
        </span>
        {others.length > 0 && (
          <span className="truncate font-mono text-[10px] text-muted-foreground uppercase">
            · {others.length} other {others.length === 1 ? "reader" : "readers"}{" "}
            here
          </span>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label="Close comments"
          title="Close comments"
          className="-mr-1 ml-auto px-2"
          onClick={onClose}
        >
          ✕
        </Button>
      </header>

      {room.rejection !== null && (
        <p className="border-b-2 border-ink bg-card px-3 py-2 text-xs text-destructive">
          {REJECTION_LABEL[room.rejection] ?? "That change was not accepted."}
        </p>
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

        {threads.length === 0 && composing === null && (
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
      </div>
    </aside>
  );
}
