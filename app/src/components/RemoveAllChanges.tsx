import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type RemoveAllChangesProps = {
  count: number;
  onConfirm: () => void;
};

function phrase(count: number): string {
  return count === 1 ? "1 change" : `${count} changes`;
}

export function RemoveAllChanges({ count, onConfirm }: RemoveAllChangesProps) {
  const [asking, setAsking] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="flex-none cursor-pointer rounded px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase transition-colors hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Put all back
      </button>
      <ConfirmDialog
        open={asking}
        title={`Put back ${phrase(count)}?`}
        description={`Everything anyone typed into this file goes, and the original wording returns. Comments and stickies stay.`}
        confirmLabel={`Put back ${phrase(count)}`}
        destructive
        onConfirm={() => {
          setAsking(false);
          onConfirm();
        }}
        onCancel={() => setAsking(false)}
      />
    </>
  );
}
