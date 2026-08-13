import { threadsIn, type OverlayEntry } from "@/lib/protocol";
import type { MarkPlacement } from "@/hooks/useArtifactBridge";

export type ReanchorCounts = {
  total: number;
  placed: number;
  needReview: number;
};

export function reanchorCounts(
  entries: OverlayEntry[],
  marks: MarkPlacement,
): ReanchorCounts {
  const threads = threadsIn(entries);
  const lost = new Set(marks.orphaned);
  const needReview = threads.filter((thread) => lost.has(thread.id)).length;
  return {
    total: threads.length,
    placed: threads.length - needReview,
    needReview,
  };
}

export function describeReanchoring(counts: ReanchorCounts): string {
  if (counts.total === 0) {
    return "New version loaded. There was no feedback to carry over.";
  }
  if (counts.needReview === 0) {
    return `New version loaded. All ${counts.total} carried over.`;
  }
  return `New version loaded. ${counts.placed} of ${counts.total} carried over, ${counts.needReview} need review.`;
}
