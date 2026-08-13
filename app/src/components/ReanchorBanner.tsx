import { Button } from "@/components/ui/button";

type ReanchorBannerProps = {
  message: string;
  tone: "report" | "error";
  onDismiss: () => void;
};

export function ReanchorBanner({
  message,
  tone,
  onDismiss,
}: ReanchorBannerProps) {
  const background = tone === "error" ? "bg-destructive/10" : "bg-accent/40";

  return (
    <div
      role="status"
      className={`flex items-center gap-3 border-b-2 border-ink px-3 py-1.5 ${background}`}
    >
      <p className="min-w-0 flex-1 truncate text-sm text-foreground">
        {message}
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  );
}
