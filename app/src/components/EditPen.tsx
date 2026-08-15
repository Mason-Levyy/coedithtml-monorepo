import { cn } from "@/lib/utils";

type EditPenProps = {
  armed: boolean;
  color: string;
  onToggle: () => void;
};

export function EditPen({ armed, color, onToggle }: EditPenProps) {
  const label = armed ? "Stop editing text" : "Edit text";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={armed}
      title={
        armed
          ? "Click any paragraph to rewrite it. Esc turns this off."
          : "Turn on editing, or double-click any text"
      }
      onClick={onToggle}
      className={cn(
        "relative flex size-8 flex-none items-center justify-center rounded-md transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none",
        armed
          ? "shadow-xs text-ink"
          : "text-foreground hover:bg-paper/80 active:scale-95 bg-transparent",
      )}
      style={armed ? { backgroundColor: `${color}33` } : undefined}
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
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
      <span className="sr-only">{label}</span>
    </button>
  );
}
