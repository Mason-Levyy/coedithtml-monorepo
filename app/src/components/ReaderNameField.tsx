import { useState } from "react";
import { ReaderColorPicker } from "@/components/ReaderColorPicker";
import { Button } from "@/components/ui/button";
import type { ReaderIdentity } from "@/hooks/useReaderIdentity";

export function ReaderNameField({ identity }: { identity: ReaderIdentity }) {
  const [draft, setDraft] = useState(identity.reader.displayName);
  const changed = draft.trim() !== identity.reader.displayName;

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        identity.rename(draft);
      }}
    >
      <ReaderColorPicker color={identity.color} onPick={identity.recolor} />
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => changed && identity.rename(draft)}
        placeholder="Your name"
        aria-label="Your name"
        className="min-w-0 flex-1 border-2 border-line bg-paper-2 px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring"
      />
      {changed && (
        <Button type="submit" size="sm" variant="outline">
          Save
        </Button>
      )}
    </form>
  );
}
