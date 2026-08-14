import type { ReactNode } from "react";

type ViewerBarProps = {
  title: string;
  fileName: string;
  children: ReactNode;
};

export function ViewerBar({ title, fileName, children }: ViewerBarProps) {
  void title;
  void fileName;
  return (
    <div className="flex items-center justify-between border-b border-line bg-card px-4 py-2">
      <a
        href="/"
        className="flex-none font-extrabold tracking-tight text-[15px] text-foreground select-none hover:opacity-90"
      >
        coedit<span className="text-blue-600 font-bold">HTML</span>
      </a>
      <div className="flex flex-none items-center">{children}</div>
    </div>
  );
}
