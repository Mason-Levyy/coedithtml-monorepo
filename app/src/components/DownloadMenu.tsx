import { useState } from "react";
import { DownloadControls } from "@/components/DownloadControls";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";

type DownloadMenuProps = {
  artifactUrl: string;
};

export function DownloadMenu({ artifactUrl }: DownloadMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      className="w-72"
      trigger={(props) => (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 rounded-sm text-foreground hover:bg-paper/80 hover:text-foreground transition-colors"
          aria-label="Download"
          title="Download"
          {...props}
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </Button>
      )}
    >
      <DownloadControls artifactUrl={artifactUrl} />
    </Popover>
  );
}
