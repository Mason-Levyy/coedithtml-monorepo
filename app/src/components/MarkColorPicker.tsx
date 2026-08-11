import {
  MARK_COLORS,
  MARK_EDGE,
  MARK_FILL,
  effectiveEdge,
  effectiveFill,
  nearestPreset,
  normalizeHex,
  type MarkColor,
} from "@/lib/protocol";
import { cn } from "@/lib/utils";

export type MarkPaint = { color: MarkColor; fill: string | null };

// Painted on the swatch itself: tinting it with the fill hid it among the presets.
const COLOUR_WHEEL =
  "conic-gradient(#e5484d, #f76b15, #ffb224, #46a758, #12a594, #0091ff, #3e63dd, #8e4ec6, #e93d82, #e5484d)";

type MarkColorPickerProps = {
  value: MarkPaint;
  onChange: (paint: MarkPaint) => void;
};

// The name is what a client too old to read `fill` will paint.
export function paintFromHex(hex: string): MarkPaint | null {
  const fill = normalizeHex(hex);
  return fill === null ? null : { color: nearestPreset(fill), fill };
}

export function MarkColorPicker({ value, onChange }: MarkColorPickerProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Colour">
      {MARK_COLORS.map((color) => {
        const chosen = value.fill === null && color === value.color;
        return (
          <button
            key={color}
            type="button"
            aria-label={color}
            aria-pressed={chosen}
            onClick={() => onChange({ color, fill: null })}
            className={cn(
              "size-5 border-2 transition-transform hover:scale-110",
              chosen ? "border-ink" : "border-transparent",
            )}
            style={{
              background: MARK_FILL[color],
              outline: chosen ? `1px solid ${MARK_EDGE[color]}` : "none",
            }}
          />
        );
      })}
      <label
        title="Any colour"
        className={cn(
          "relative ml-1 size-5 cursor-pointer rounded-full border-2 transition-transform hover:scale-110",
          value.fill === null ? "border-transparent" : "border-ink",
        )}
        style={{ background: COLOUR_WHEEL }}
      >
        {value.fill !== null && (
          <span
            className="absolute inset-[3px] rounded-full border"
            style={{
              background: effectiveFill(value),
              borderColor: effectiveEdge(value),
            }}
          />
        )}
        <input
          type="color"
          aria-label="Any colour"
          value={effectiveFill(value)}
          onChange={(event) => {
            const paint = paintFromHex(event.target.value);
            if (paint !== null) {
              onChange(paint);
            }
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
