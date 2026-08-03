import type { Slide } from "@/lib/bridge-messages";
import { cn } from "@/lib/utils";

type FilmstripProps = {
  slides: Slide[];
  activeIndex: number;
  onSelectSlide: (index: number) => void;
};

export function Filmstrip({
  slides,
  activeIndex,
  onSelectSlide,
}: FilmstripProps) {
  return (
    <div
      role="tablist"
      aria-label="Slides"
      className="flex gap-1.5 overflow-x-auto border-t border-ink bg-paper-2 px-2.5 py-2"
    >
      {slides.map((slide) => {
        const isActive = slide.index === activeIndex;
        return (
          <button
            key={slide.index}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectSlide(slide.index)}
            className={cn(
              "flex w-24 flex-none flex-col gap-0.5 border bg-card px-2 py-1.5 text-left",
              isActive ? "border-2 border-primary" : "border-line",
            )}
          >
            <span className="font-mono text-[10px] text-muted-foreground">
              {String(slide.index + 1).padStart(2, "0")}
            </span>
            <span className="truncate text-xs text-foreground">
              {slide.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
