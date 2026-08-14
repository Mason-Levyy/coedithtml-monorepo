type AuthorNameFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function AuthorNameField({ value, onChange }: AuthorNameFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
        Your name
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Shown against what you leave"
        className="rounded-md border border-line bg-paper-2 px-2.5 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring"
      />
    </label>
  );
}
