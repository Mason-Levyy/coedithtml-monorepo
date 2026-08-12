import type { ReactNode } from "react";

type ViewerBarProps = {
  title: string;
  fileName: string;
  children: ReactNode;
};

export function ViewerBar({ title, fileName, children }: ViewerBarProps) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-ink bg-card px-3 py-1.5">
      <div className="flex flex-none items-center gap-2">{children}</div>
      <span className="truncate text-sm font-semibold text-foreground">
        {title}
      </span>
      {title !== fileName && (
        <span className="hidden truncate font-mono text-[10px] tracking-wide text-muted-foreground uppercase sm:inline">
          {fileName}
        </span>
      )}
    </div>
  );
}
