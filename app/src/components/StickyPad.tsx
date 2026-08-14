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
          "relative flex size-8 flex-none items-center justify-center rounded-md transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none",
          armed
            ? "shadow-xs text-ink"
            : "text-foreground hover:bg-paper/80 active:scale-95 bg-transparent",
        )}
        style={
          armed
            ? {
                backgroundColor: `${color}33`,
              }
            : undefined
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink"
        >
          <line x1="12" y1="17" x2="12" y2="22" />
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
        </svg>
        <span className="sr-only">{armed ? "Click page" : "Sticky"}</span>
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
