import {
  DEFAULT_MARK_COLOR,
  nearestPreset,
  normalizeHex,
  type MarkColor,
} from "@/lib/protocol";

export type MarkPaint = { color: MarkColor; fill: string | null };

export function paintFor(hex: string): MarkPaint {
  const fill = normalizeHex(hex);
  return fill === null
    ? { color: DEFAULT_MARK_COLOR, fill: null }
    : { color: nearestPreset(fill), fill };
}
