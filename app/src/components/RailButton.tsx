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
      size="sm"
      variant={open ? "outline" : "default"}
      aria-label={open ? "Hide comments" : "Show comments"}
      aria-expanded={open}
      onClick={onToggle}
    >
      <span>Comments</span>
      {unresolved > 0 && (
        <span className="border border-current px-1 text-[10px]">
          {unresolved} open
        </span>
      )}
    </Button>
  );
}
