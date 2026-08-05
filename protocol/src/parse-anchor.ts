import type { Anchor, RegionAnchor, TextAnchor } from "./anchor";
import { asFilledString, asFraction, asRecord, asString } from "./parse-values";

function parseTextAnchor(record: Record<string, unknown>): TextAnchor | null {
  const quote = asFilledString(record.quote);
  const prefix = asString(record.prefix);
  const suffix = asString(record.suffix);
  const path = asString(record.path);
  const revision = asFilledString(record.revision);
  if (
    quote === null ||
    prefix === null ||
    suffix === null ||
    path === null ||
    revision === null
  ) {
    return null;
  }
  return { kind: "text", quote, prefix, suffix, path, revision };
}

function parseRegionAnchor(
  record: Record<string, unknown>,
): RegionAnchor | null {
  const path = asFilledString(record.path);
  const fractionX = asFraction(record.fractionX);
  const fractionY = asFraction(record.fractionY);
  const revision = asFilledString(record.revision);
  if (
    path === null ||
    fractionX === null ||
    fractionY === null ||
    revision === null
  ) {
    return null;
  }
  return { kind: "region", path, fractionX, fractionY, revision };
}

export function parseAnchor(value: unknown): Anchor | null {
  const record = asRecord(value);
  if (record === null) {
    return null;
  }
  if (record.kind === "text") {
    return parseTextAnchor(record);
  }
  if (record.kind === "region") {
    return parseRegionAnchor(record);
  }
  return null;
}

export function parseOptionalAnchor(
  value: unknown,
): { ok: true; anchor: Anchor | null } | { ok: false } {
  if (value === null || value === undefined) {
    return { ok: true, anchor: null };
  }
  const anchor = parseAnchor(value);
  return anchor === null ? { ok: false } : { ok: true, anchor };
}
