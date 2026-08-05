import { useState } from "react";
import { Button } from "@/components/ui/button";

type ReaderNameFieldProps = {
  displayName: string;
  onRename: (displayName: string) => void;
};

export function ReaderNameField({
  displayName,
  onRename,
}: ReaderNameFieldProps) {
  const [draft, setDraft] = useState(displayName);
  const changed = draft.trim() !== displayName;

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onRename(draft);
      }}
    >
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Your name"
        aria-label="Your name"
        className="min-w-0 flex-1 border-2 border-line bg-paper-2 px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring"
      />
      <Button type="submit" size="sm" variant="outline" disabled={!changed}>
        Save
      </Button>
    </form>
  );
}
