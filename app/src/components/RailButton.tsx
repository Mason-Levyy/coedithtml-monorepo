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
      variant={open ? "default" : "outline"}
      className={
        open
          ? "size-8 bg-primary text-primary-foreground hover:bg-primary/90"
          : "size-8 border-2 border-ink bg-card text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
      }
      aria-label={open ? "Hide comments" : "Show comments"}
      title={open ? "Hide comments" : "Look at comments"}
      aria-expanded={open}
      onClick={onToggle}
    >
      <div className="relative flex items-center justify-center">
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
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
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
