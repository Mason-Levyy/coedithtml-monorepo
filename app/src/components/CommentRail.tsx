import { CommentComposer } from "@/components/CommentComposer";
import { CommentThread } from "@/components/CommentThread";
import { NamePrompt } from "@/components/NamePrompt";
import { ReaderNameField } from "@/components/ReaderNameField";
import { Button } from "@/components/ui/button";
import type { DocRoom } from "@/hooks/useDocRoom";
import type { ReaderIdentity } from "@/hooks/useReaderIdentity";
import {
  repliesTo,
  threadsIn,
  unresolvedCount,
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
  promptForName: boolean;
  activeMarkId: string | null;
  orphanedMarkIds: string[];
  onActivate: (markId: string) => void;
  onComment: (body: string, displayName: string | null) => void;
  onReply: (parentId: string, body: string, displayName: string | null) => void;
  onDismissSelection: () => void;
  onClose: () => void;
};

export function CommentRail({
  room,
  identity,
  composing,
  promptForName,
  activeMarkId,
  orphanedMarkIds,
  onActivate,
  onComment,
  onReply,
  onDismissSelection,
  onClose,
}: CommentRailProps) {
  const threads = threadsIn(room.entries);
  const unresolved = unresolvedCount(room.entries);
  const others = room.readers.filter(
    (reader) => reader.id !== identity.reader.id,
  );
  const canMarkUp = room.canWrite;
  const needsName = room.canWrite && !identity.named;

  return (
    <aside className="flex h-full w-[min(20rem,100vw)] flex-none flex-col border-l-2 border-ink bg-paper">
      <header className="flex flex-col gap-2 border-b-2 border-ink px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-xs tracking-wide uppercase">
            {unresolved} open
          </h2>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground uppercase">
            {STATUS_LABEL[room.status]}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="Hide comments"
            title="Hide comments"
            className="-mr-1 px-2"
            onClick={onClose}
          >
            ✕
          </Button>
        </div>
        {others.length > 0 && (
          <p className="truncate font-mono text-[10px] text-muted-foreground uppercase">
            {others.length} other {others.length === 1 ? "reader" : "readers"}{" "}
            here
          </p>
        )}
        {identity.named && <ReaderNameField identity={identity} />}
      </header>

      {room.rejection !== null && (
        <p className="border-b-2 border-ink bg-card px-3 py-2 text-xs text-destructive">
          {REJECTION_LABEL[room.rejection] ?? "That change was not accepted."}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {/* The composer carries its own name field, and two at once reads as two questions. */}
        {promptForName && needsName && composing === null && (
          <NamePrompt identity={identity} />
        )}

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
            orphaned={orphanedMarkIds.includes(entry.id)}
            onActivate={() => onActivate(entry.id)}
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
