import { ReaderNameField } from "@/components/ReaderNameField";
import type { ReaderIdentity } from "@/hooks/useReaderIdentity";

export function NamePrompt({ identity }: { identity: ReaderIdentity }) {
  return (
    <div className="flex flex-col gap-2 border-2 border-ink bg-card p-3">
      <p className="text-sm">
        Put your name in to comment. Everyone here will see it against what you
        leave.
      </p>
      <ReaderNameField identity={identity} />
    </div>
  );
}
