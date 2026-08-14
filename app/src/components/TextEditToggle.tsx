import { Button } from "@/components/ui/button";

type TextEditToggleProps = {
  armed: boolean;
  onToggle: () => void;
};

export function TextEditToggle({ armed, onToggle }: TextEditToggleProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-pressed={armed}
      aria-label={armed ? "Stop editing text" : "Edit text"}
      title={armed ? "Stop editing text" : "Edit text"}
      onClick={onToggle}
      className={`size-8 border-2 border-ink transition-colors ${
        armed
          ? "bg-primary text-primary-foreground"
          : "bg-card text-foreground hover:bg-primary hover:text-primary-foreground"
      }`}
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
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </Button>
  );
}
