import { useRef } from "react";
import type { KeyboardEvent } from "react";
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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusAndSelect(position: number): void {
    const slide = slides[position];
    if (slide === undefined) return;
    onSelectSlide(slide.index);
    tabRefs.current[position]?.focus();
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    position: number,
  ): void {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusAndSelect(Math.min(position + 1, slides.length - 1));
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusAndSelect(Math.max(position - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        event.preventDefault();
        focusAndSelect(slides.length - 1);
        break;
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Slides"
      className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto border-t border-ink bg-paper-2 px-2.5 py-2"
    >
      {slides.map((slide, position) => {
        const isActive = slide.index === activeIndex;
        return (
          <button
            key={slide.index}
            ref={(el) => {
              tabRefs.current[position] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelectSlide(slide.index)}
            onKeyDown={(event) => handleKeyDown(event, position)}
            className={cn(
              "flex w-24 flex-none snap-start flex-col gap-0.5 border bg-card px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
