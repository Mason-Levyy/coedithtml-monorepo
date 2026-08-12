import type { ViewportPoint } from "@/lib/frame-geometry";

type SelectionActionProps = {
  at: ViewportPoint;
  onComment: () => void;
};

export function SelectionAction({ at, onComment }: SelectionActionProps) {
  return (
    <button
      type="button"
      onClick={onComment}
      aria-label="Comment on the selected text"
      style={{ left: at.x, top: at.y }}
      className="fixed z-30 mt-1.5 border-2 border-ink bg-ink px-2 py-1 font-mono text-[10px] tracking-wide text-paper uppercase shadow-md hover:bg-wet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      Comment
    </button>
  );
}
