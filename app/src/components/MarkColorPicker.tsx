import {
  MARK_COLORS,
  MARK_EDGE,
  MARK_FILL,
  type MarkColor,
} from "@/lib/protocol";
import { cn } from "@/lib/utils";

type MarkColorPickerProps = {
  value: MarkColor;
  onChange: (color: MarkColor) => void;
};

export function MarkColorPicker({ value, onChange }: MarkColorPickerProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Colour">
      {MARK_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          aria-pressed={color === value}
          onClick={() => onChange(color)}
          className={cn(
            "size-5 border-2 transition-transform hover:scale-110",
            color === value ? "border-ink" : "border-transparent",
          )}
          style={{
            background: MARK_FILL[color],
            outline: color === value ? `1px solid ${MARK_EDGE[color]}` : "none",
          }}
        />
      ))}
    </div>
  );
}
