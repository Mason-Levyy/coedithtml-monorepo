import { useEffect, useRef, useState } from "react";
import { PALETTE_COLUMNS, READER_PALETTE } from "@/lib/palette";
import { textOn } from "@/lib/protocol";
import { cn } from "@/lib/utils";

type ReaderColorPickerProps = {
  color: string;
  onPick: (color: string) => void;
};

const HINT =
  "Everything you leave is marked in this colour. Click to change it.";

export function ReaderColorPicker({ color, onPick }: ReaderColorPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent): void {
      const target = event.target;
      if (target instanceof Node && !wrapper.current?.contains(target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative flex-none">
      <button
        type="button"
        title={HINT}
        aria-label="Your colour"
        aria-expanded={open}
        onClick={() => setOpen((shown) => !shown)}
        className="flex size-7 items-center justify-center border-2 border-ink text-[10px] focus-visible:outline-2 focus-visible:outline-ring"
        style={{ background: color, color: textOn(color) }}
      >
        ▾
      </button>

      {open && (
        <div
          role="group"
          aria-label="Pick your colour"
          className="absolute top-full right-0 z-30 mt-1 flex flex-col gap-2 border-2 border-ink bg-paper-2 p-2 shadow-lg"
        >
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${PALETTE_COLUMNS}, minmax(0, 1fr))`,
            }}
          >
            {READER_PALETTE.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={swatch === color}
                onClick={() => {
                  onPick(swatch);
                  setOpen(false);
                }}
                className={cn(
                  "size-5 border transition-transform hover:scale-110",
                  swatch === color
                    ? "border-ink ring-1 ring-ink"
                    : "border-line",
                )}
                style={{ background: swatch }}
              />
            ))}
          </div>
          <p className="max-w-52 text-[11px] text-muted-foreground">{HINT}</p>
        </div>
      )}
    </div>
  );
}
