import { Button } from "@/components/ui/button";

type UndoRedoProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export function UndoRedo({ canUndo, canRedo, onUndo, onRedo }: UndoRedoProps) {
  if (!canUndo && !canRedo) {
    return null;
  }

  return (
    <div className="flex flex-none items-center">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label="Undo"
        title="Undo your last change"
        disabled={!canUndo}
        onClick={onUndo}
        className="size-7 p-0 text-muted-foreground hover:text-foreground"
      >
        ↶
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label="Redo"
        title="Redo the change you just undid"
        disabled={!canRedo}
        onClick={onRedo}
        className="size-7 p-0 text-muted-foreground hover:text-foreground"
      >
        ↷
      </Button>
    </div>
  );
}
