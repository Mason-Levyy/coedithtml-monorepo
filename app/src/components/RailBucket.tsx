import { useState, type ReactNode } from "react";

type RailBucketProps = {
  label: string;
  count: number;
  children: ReactNode;
  action?: ReactNode;
};

export function RailBucket({
  label,
  count,
  children,
  action,
}: RailBucketProps) {
  const [open, setOpen] = useState(true);

  if (count === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2 border-b border-line pb-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((shown) => !shown)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left font-mono text-[10px] tracking-wide text-muted-foreground uppercase hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span aria-hidden className="flex-none text-[8px]">
            {open ? "▼" : "▶"}
          </span>
          <span className="truncate">{label}</span>
          <span className="flex-none">· {count}</span>
        </button>
        {open && action}
      </div>
      {open && <div className="flex flex-col gap-3">{children}</div>}
    </section>
  );
}
