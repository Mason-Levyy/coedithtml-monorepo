import { useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { validateArtifactFile } from "@/lib/upload-artifact";
import type { UploadRejection } from "@/lib/upload-rejection";
import { cn } from "@/lib/utils";

type UploadDropzoneProps = {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  rejection?: UploadRejection | null;
};

export function UploadDropzone({
  onFileSelected,
  disabled = false,
  rejection = null,
}: UploadDropzoneProps) {
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [refused, setRefused] = useState<UploadRejection | null>(null);

  function acceptIfValid(file: File): void {
    const invalidReason = validateArtifactFile(file);
    setRefused(invalidReason);
    if (invalidReason === null) {
      onFileSelected(file);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file !== undefined) {
      acceptIfValid(file);
    }
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    setIsDraggedOver(false);
    if (disabled) return;
    const file = event.dataTransfer.files[0];
    if (file !== undefined) {
      acceptIfValid(file);
    }
  }

  const shown = refused ?? rejection;

  return (
    <div>
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line hover:border-ink/40 bg-card px-6 py-10 text-center transition-colors shadow-xs",
          isDraggedOver && "border-solid border-primary bg-paper",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDraggedOver(true);
        }}
        onDragLeave={() => setIsDraggedOver(false)}
        onDrop={handleDrop}
      >
        <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          Drop a .html file, or click to browse
        </span>
        <input
          type="file"
          accept=".html,.htm"
          className="sr-only"
          disabled={disabled}
          onChange={handleInputChange}
        />
      </label>
      {shown !== null && (
        <div
          role="alert"
          className="mt-3 flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-left"
        >
          <div className="flex items-center gap-2 text-destructive font-semibold text-xs font-mono uppercase tracking-wide">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{shown.headline}</span>
          </div>
          <p className="text-sm text-foreground">{shown.detail}</p>
          {shown.remedy !== null && (
            <p className="border-t border-destructive/20 pt-2 text-sm text-muted-foreground">
              {shown.remedy}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
