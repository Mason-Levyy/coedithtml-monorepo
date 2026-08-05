export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function asFilledString(value: unknown): string | null {
  const text = asString(value);
  return text !== null && text.length > 0 ? text : null;
}

export function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function asFraction(value: unknown): number | null {
  const size = asFiniteNumber(value);
  return size !== null && size >= 0 && size <= 1 ? size : null;
}
