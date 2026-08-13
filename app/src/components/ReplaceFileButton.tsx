import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { validateArtifactFile } from "@/lib/upload-artifact";

type ReplaceFileButtonProps = {
  pending: boolean;
  onReplace: (file: File) => void;
  onReject: (message: string) => void;
};

export function ReplaceFileButton({
  pending,
  onReplace,
  onReject,
}: ReplaceFileButtonProps) {
  const input = useRef<HTMLInputElement>(null);

  function chooseFile(file: File | undefined): void {
    if (file === undefined) {
      return;
    }
    const rejection = validateArtifactFile(file);
    if (rejection === null) {
      onReplace(file);
    } else {
      onReject(rejection);
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".html,.htm,text/html"
        className="hidden"
        onChange={(event) => {
          chooseFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label="Replace file"
        onClick={() => input.current?.click()}
      >
        {pending ? "Replacing…" : "Replace"}
      </Button>
    </>
  );
}
