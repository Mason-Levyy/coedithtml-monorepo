import { Button } from "@/components/ui/button";
import type { MarkPlacementState } from "@/lib/mark-placement";

const NOTE = "mt-2 font-mono text-[10px] uppercase";

type ThreadPlacementProps = {
  state: MarkPlacementState;
  onReveal: () => void;
};

export function ThreadPlacement({ state, onReveal }: ThreadPlacementProps) {
  if (state === "orphaned") {
    return (
      <p className={`${NOTE} text-destructive`}>
        The text this points at is gone
      </p>
    );
  }
  if (state === "hidden") {
    return (
      <p className={`${NOTE} text-muted-foreground`}>
        The artifact is not showing this right now
      </p>
    );
  }
  if (state === "offscreen") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2"
        onClick={onReveal}
      >
        Show me
      </Button>
    );
  }
  return null;
}
