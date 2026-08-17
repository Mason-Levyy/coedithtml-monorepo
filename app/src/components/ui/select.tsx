import { cn } from "@/lib/utils";

type SelectProps<Option extends string> = {
  label: string;
  value: Option;
  options: readonly Option[];
  labelFor: Record<Option, string>;
  onChange: (value: Option) => void;
  className?: string;
};

export function Select<Option extends string>({
  label,
  value,
  options,
  labelFor,
  onChange,
  className,
}: SelectProps<Option>) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => {
        const chosen = options.find((option) => option === event.target.value);
        if (chosen !== undefined) {
          onChange(chosen);
        }
      }}
      className={cn(
        "h-8 flex-none border border-line bg-paper-2 px-1.5 font-mono text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labelFor[option]}
        </option>
      ))}
    </select>
  );
}
