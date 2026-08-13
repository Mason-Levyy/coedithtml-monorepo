import type { MarkPlacement } from "@/hooks/useArtifactBridge";

export type MarkPlacementState =
  "visible" | "offscreen" | "hidden" | "orphaned";

export function placementOf(
  marks: MarkPlacement,
  markId: string,
): MarkPlacementState {
  if (marks.orphaned.includes(markId)) {
    return "orphaned";
  }
  if (marks.hidden.includes(markId)) {
    return "hidden";
  }
  return marks.offscreen.includes(markId) ? "offscreen" : "visible";
}
