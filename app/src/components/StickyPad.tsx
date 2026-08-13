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

const DRAG_THRESHOLD = 5;

const FOLDED_EAR = "polygon(100% 0, 100% 100%, 0 100%)";

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
          "relative flex h-8 min-w-28 flex-none items-center justify-center",
          "border-2 border-ink px-2 touch-none select-none",
          "font-mono text-xs tracking-wide uppercase",
          "focus-visible:outline-2 focus-visible:outline-ring",
          armed && "outline-2 outline-offset-2 outline-ink",
        )}
        style={{
          background: effectiveFill(paint),
          color: textOn(effectiveFill(paint)),
        }}
      >
        <span>{armed ? "Click page" : "Sticky"}</span>
        <span
          aria-hidden
          className="absolute right-0 bottom-0 size-3"
          style={{
            background: effectiveEdge(paint),
            clipPath: FOLDED_EAR,
          }}
        />
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
