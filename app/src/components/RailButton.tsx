import { Button } from "@/components/ui/button";

type RailButtonProps = {
  open: boolean;
  unresolved: number;
  onToggle: () => void;
};

export function RailButton({ open, unresolved, onToggle }: RailButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="relative size-8 rounded-sm text-foreground hover:bg-paper/80 hover:text-foreground transition-colors"
      aria-label={open ? "Hide comments" : "Show comments"}
      title={open ? "Hide comments" : "Show comments"}
      aria-expanded={open}
      onClick={onToggle}
    >
      <div className="relative flex items-center justify-center">
        {/* Sidebar panel trigger icon */}
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
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M15 3v18" />
          <path d="m10 9-3 3 3 3" />
        </svg>
        {unresolved > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            <span className="sr-only">{unresolved} open</span>
            <span aria-hidden>{unresolved}</span>
          </span>
        )}
      </div>
    </Button>
  );
}
