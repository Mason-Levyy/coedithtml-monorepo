import { useRef, useState } from "react";
import { effectiveEdge, effectiveFill, textOn } from "@/lib/protocol";
import { paintFor } from "@/lib/paint";
import { cn } from "@/lib/utils";

export type PadPoint = { x: number; y: number };

type StickyPadProps = {
  armed: boolean;
  color: string;
  onArm: () => void;
  onDrop: (point: PadPoint) => void;
};

// Below this a press is a click, and a click arms the pad instead of dropping.
const DRAG_THRESHOLD = 5;

function travelled(from: PadPoint, to: PadPoint): number {
  return Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
}

export function StickyPad({ armed, color, onArm, onDrop }: StickyPadProps) {
  const [ghost, setGhost] = useState<PadPoint | null>(null);
  const origin = useRef<PadPoint | null>(null);
  const paint = paintFor(color);

  function finish(): void {
    origin.current = null;
    setGhost(null);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Add a sticky"
        aria-pressed={armed}
        title="Drag onto the artifact, or click and then click the page"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          origin.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          const from = origin.current;
          const at = { x: event.clientX, y: event.clientY };
          if (from !== null && travelled(from, at) > DRAG_THRESHOLD) {
            setGhost(at);
          }
        }}
        onPointerUp={(event) => {
          const dragged = ghost !== null;
          finish();
          if (dragged) {
            onDrop({ x: event.clientX, y: event.clientY });
            return;
          }
          onArm();
        }}
        onPointerCancel={finish}
        className={cn(
          "flex items-center gap-2 border-2 border-ink px-3 py-2 shadow-md transition-transform",
          "touch-none select-none hover:-translate-y-0.5",
          armed ? "bg-ink text-paper" : "bg-paper-2",
        )}
      >
        <span
          aria-hidden
          className="size-4 flex-none rounded-[2px] border"
          style={{
            background: effectiveFill(paint),
            borderColor: effectiveEdge(paint),
          }}
        />
        <span className="font-mono text-[10px] tracking-wide uppercase">
          {armed ? "Click the page" : "Sticky"}
        </span>
      </button>

      {ghost !== null && (
        <span
          aria-hidden
          className="pointer-events-none fixed z-50 h-12 w-32 rounded-lg border opacity-80 shadow-sm"
          style={{
            left: ghost.x,
            top: ghost.y,
            background: effectiveFill(paint),
            borderColor: effectiveEdge(paint),
            color: textOn(effectiveFill(paint)),
          }}
        />
      )}
    </>
  );
}
