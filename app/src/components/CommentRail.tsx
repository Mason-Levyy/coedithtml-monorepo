import {
  CommentComposer,
  type ComposedMark,
} from "@/components/CommentComposer";
import { CommentThread } from "@/components/CommentThread";
import { NamePrompt } from "@/components/NamePrompt";
import { ReaderNameField } from "@/components/ReaderNameField";
import { StickyProperties } from "@/components/StickyProperties";
import { Button } from "@/components/ui/button";
import type { ArtifactSelection } from "@/hooks/useArtifactBridge";
import type { DocRoom } from "@/hooks/useDocRoom";
import type { ReaderIdentity } from "@/hooks/useReaderIdentity";
import {
  repliesTo,
  threadsIn,
  unresolvedCount,
  type RejectionReason,
  type StickyEntry,
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
  selection: ArtifactSelection | null;
  activeMarkId: string | null;
  orphanedMarkIds: string[];
  placingSticky: boolean;
  onPlaceSticky: () => void;
  onActivate: (markId: string) => void;
  onComment: (mark: ComposedMark) => void;
  onReply: (parentId: string, body: string) => void;
  onDismissSelection: () => void;
};

export function CommentRail({
  room,
  identity,
  selection,
  activeMarkId,
  orphanedMarkIds,
  placingSticky,
  onPlaceSticky,
  onActivate,
  onComment,
  onReply,
  onDismissSelection,
}: CommentRailProps) {
  const threads = threadsIn(room.entries);
  const unresolved = unresolvedCount(room.entries);
  const others = room.readers.filter(
    (reader) => reader.id !== identity.reader.id,
  );
  const canMarkUp = room.canWrite && identity.named;
  const needsName = room.canWrite && !identity.named;
  const activeSticky = room.entries.find(
    (entry): entry is StickyEntry =>
      entry.id === activeMarkId && entry.kind === "sticky",
  );

  return (
    <aside className="flex h-full w-80 flex-none flex-col border-l-2 border-ink bg-paper">
      <header className="flex flex-col gap-2 border-b-2 border-ink px-3 py-2">
        <div className="flex items-baseline gap-2">
          <h2 className="font-mono text-xs tracking-wide uppercase">
            {unresolved} open
          </h2>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground uppercase">
            {STATUS_LABEL[room.status]}
          </span>
        </div>
        {others.length > 0 && (
          <p className="truncate font-mono text-[10px] text-muted-foreground uppercase">
            {others.length} other {others.length === 1 ? "reader" : "readers"}{" "}
            here
          </p>
        )}
        {!needsName && (
          <ReaderNameField
            displayName={identity.reader.displayName}
            onRename={identity.rename}
          />
        )}
        {canMarkUp && (
          <Button
            type="button"
            size="sm"
            variant={placingSticky ? "default" : "outline"}
            onClick={onPlaceSticky}
          >
            {placingSticky ? "Click the artifact" : "Add a sticky"}
          </Button>
        )}
      </header>

      {room.rejection !== null && (
        <p className="border-b-2 border-ink bg-card px-3 py-2 text-xs text-destructive">
          {REJECTION_LABEL[room.rejection] ?? "That change was not accepted."}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {needsName && (
          <NamePrompt
            displayName={identity.reader.displayName}
            onRename={identity.rename}
          />
        )}

        {activeSticky !== undefined && canMarkUp && (
          <StickyProperties
            entry={activeSticky}
            onPatch={(patch) => room.patchEntry(activeSticky.id, patch)}
            onRemove={() => room.removeEntry(activeSticky.id)}
          />
        )}

        {selection !== null && canMarkUp && (
          <CommentComposer
            anchor={selection.anchor}
            onSubmit={onComment}
            onDismiss={onDismissSelection}
          />
        )}

        {threads.length === 0 && selection === null && (
          <p className="text-sm text-muted-foreground">
            {canMarkUp
              ? "Select text in the artifact to comment on it, or drop a sticky anywhere."
              : "No comments yet."}
          </p>
        )}

        {threads.map((entry) => (
          <CommentThread
            key={entry.id}
            entry={entry}
            replies={repliesTo(room.entries, entry.id)}
            canWrite={canMarkUp}
            active={entry.id === activeMarkId}
            orphaned={orphanedMarkIds.includes(entry.id)}
            onActivate={() => onActivate(entry.id)}
            onReply={(body) => onReply(entry.id, body)}
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
