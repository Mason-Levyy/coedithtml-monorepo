import type { ReactNode } from "react";
import { useDismissOnOutside } from "@/hooks/useDismissOnOutside";
import { cn } from "@/lib/utils";

type PopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: (props: {
    onClick: () => void;
    "aria-expanded": boolean;
  }) => ReactNode;
  align?: "start" | "end";
  className?: string;
  children: ReactNode;
};

export function Popover({
  open,
  onOpenChange,
  trigger,
  align = "start",
  className,
  children,
}: PopoverProps) {
  const wrapper = useDismissOnOutside(open, () => onOpenChange(false));

  return (
    <div ref={wrapper} className="relative flex-none">
      {trigger({
        onClick: () => onOpenChange(!open),
        "aria-expanded": open,
      })}
      {open && (
        <div
          className={cn(
            "absolute top-full z-30 mt-1 flex flex-col gap-2 border-2 border-ink bg-paper-2 p-2 shadow-lg",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
