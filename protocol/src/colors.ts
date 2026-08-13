import { DEFAULT_MARK_COLOR, MARK_COLORS, type MarkColor } from "./overlay";

export const MARK_FILL: Record<MarkColor, string> = {
  yellow: "#fff3a3",
  pink: "#ffc6d9",
  green: "#c2f0c6",
  blue: "#c3ddff",
  purple: "#ded0f9",
  orange: "#ffdcab",
};

export const MARK_EDGE: Record<MarkColor, string> = {
  yellow: "#e0c419",
  pink: "#e0708f",
  green: "#5fbf68",
  blue: "#5b9ae0",
  purple: "#9b7ad6",
  orange: "#e09a3d",
};

const HEX = /^#[0-9a-f]{6}$/;
const SHORT_HEX = /^#[0-9a-f]{3}$/;

export function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim().toLowerCase();
  if (HEX.test(text)) {
    return text;
  }
  if (!SHORT_HEX.test(text)) {
    return null;
  }
  return `#${[...text.slice(1)].map((digit) => digit + digit).join("")}`;
}

type Rgb = { r: number; g: number; b: number };

function toRgb(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}

function toHex({ r, g, b }: Rgb): string {
  const channel = (value: number): string =>
    Math.round(Math.min(Math.max(value, 0), 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

type Hsl = { h: number; s: number; l: number };

function toHsl(hex: string): Hsl {
  const { r, g, b } = toRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const span = max - min;
  const l = (max + min) / 2;
  if (span === 0) {
    return { h: 0, s: 0, l };
  }
  const s = span / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / span + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / span + 2) / 6
        : ((r - g) / span + 4) / 6;
  return { h, s, l };
}

function fromHsl({ h, s, l }: Hsl): string {
  const reach = s * Math.min(l, 1 - l);
  const channel = (turn: number): number => {
    const wheel = (turn + h * 12) % 12;
    return l - reach * Math.max(-1, Math.min(wheel - 3, 9 - wheel, 1));
  };
  return toHex({ r: channel(0), g: channel(8), b: channel(4) });
}

export function deriveEdge(fill: string): string {
  const { h, s, l } = toHsl(fill);
  return fromHsl({
    h,
    s: Math.min(s * 0.72, 1),
    l: Math.min(Math.max(l * 0.65, 0.18), 0.62),
  });
}

const LIGHT_INK = "#f5f5f5";
const DARK_INK = "#17171a";

function channelLuminance(value: number): number {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function textOn(fill: string): string {
  const { r, g, b } = toRgb(fill);
  const luminance =
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b);
  return luminance > 0.36 ? DARK_INK : LIGHT_INK;
}

type Painted = { color: MarkColor; fill: string | null };

export function effectiveFill(mark: Painted): string {
  return mark.fill ?? MARK_FILL[mark.color];
}

export function effectiveEdge(mark: Painted): string {
  return mark.fill === null ? MARK_EDGE[mark.color] : deriveEdge(mark.fill);
}

export function nearestPreset(fill: string): MarkColor {
  const target = toHsl(fill);
  if (target.s < 0.1) {
    return DEFAULT_MARK_COLOR;
  }
  let nearest: MarkColor = DEFAULT_MARK_COLOR;
  let best = Infinity;
  for (const color of MARK_COLORS) {
    const gap = Math.abs(toHsl(MARK_FILL[color]).h - target.h);
    const distance = Math.min(gap, 1 - gap);
    if (distance < best) {
      best = distance;
      nearest = color;
    }
  }
  return nearest;
}
