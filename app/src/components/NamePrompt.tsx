import { ReaderNameField } from "@/components/ReaderNameField";

type NamePromptProps = {
  displayName: string;
  onRename: (displayName: string) => void;
};

export function NamePrompt({ displayName, onRename }: NamePromptProps) {
  return (
    <div className="flex flex-col gap-2 border-2 border-ink bg-card p-3">
      <p className="text-sm">
        Put your name in to comment. Everyone here will see it against what you
        leave.
      </p>
      <ReaderNameField displayName={displayName} onRename={onRename} />
    </div>
  );
}
