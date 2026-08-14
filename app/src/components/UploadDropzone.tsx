import { useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { validateArtifactFile } from "@/lib/upload-artifact";
import { cn } from "@/lib/utils";

type UploadDropzoneProps = {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  errorMessage?: string | null;
};

export function UploadDropzone({
  onFileSelected,
  disabled = false,
  errorMessage = null,
}: UploadDropzoneProps) {
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function acceptIfValid(file: File): void {
    const invalidReason = validateArtifactFile(file);
    setValidationError(invalidReason);
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

  const shownError = validationError ?? errorMessage;

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
      {shownError !== null && (
        <p className="mt-2 font-mono text-xs text-destructive">{shownError}</p>
      )}
    </div>
  );
}
