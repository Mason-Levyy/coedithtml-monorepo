export const CONTEXT_LENGTH = 32;

export type TextAnchor = {
  kind: "text";
  quote: string;
  prefix: string;
  suffix: string;
  path: string;
  revision: string;
};

export type RegionAnchor = {
  kind: "region";
  path: string;
  fractionX: number;
  fractionY: number;
  revision: string;
};

export type Anchor = TextAnchor | RegionAnchor;

export function normalizeAnchorText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function anchorFromText(options: {
  text: string;
  start: number;
  end: number;
  path: string;
  revision: string;
}): TextAnchor | null {
  const { text, start, end, path, revision } = options;
  if (start < 0 || end > text.length || end <= start) {
    return null;
  }
  const quote = text.slice(start, end);
  if (quote.trim().length === 0) {
    return null;
  }
  return {
    kind: "text",
    quote,
    prefix: text.slice(Math.max(0, start - CONTEXT_LENGTH), start),
    suffix: text.slice(end, end + CONTEXT_LENGTH),
    path,
    revision,
  };
}

function isFraction(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

export function regionAnchor(options: {
  path: string;
  fractionX: number;
  fractionY: number;
  revision: string;
}): RegionAnchor | null {
  const { path, fractionX, fractionY, revision } = options;
  if (path.length === 0 || !isFraction(fractionX) || !isFraction(fractionY)) {
    return null;
  }
  return { kind: "region", path, fractionX, fractionY, revision };
}

export type AnchorResolution =
  | { ok: true; start: number; end: number }
  | { ok: false; reason: "ambiguous"; matches: number[] }
  | { ok: false; reason: "orphaned" };

function occurrencesOf(haystack: string, needle: string): number[] {
  const found: number[] = [];
  if (needle.length === 0) {
    return found;
  }
  for (let from = 0; ;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) {
      return found;
    }
    found.push(at);
    from = at + 1;
  }
}

function sharedTailLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let shared = 0;
  while (
    shared < limit &&
    a[a.length - 1 - shared] === b[b.length - 1 - shared]
  ) {
    shared += 1;
  }
  return shared;
}

function sharedHeadLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let shared = 0;
  while (shared < limit && a[shared] === b[shared]) {
    shared += 1;
  }
  return shared;
}

function contextScore(text: string, at: number, anchor: TextAnchor): number {
  const before = text.slice(Math.max(0, at - anchor.prefix.length), at);
  const afterAt = at + anchor.quote.length;
  const after = text.slice(afterAt, afterAt + anchor.suffix.length);
  return (
    sharedTailLength(before, anchor.prefix) +
    sharedHeadLength(after, anchor.suffix)
  );
}

export function resolveAnchorInText(
  text: string,
  anchor: TextAnchor,
): AnchorResolution {
  const matches = occurrencesOf(text, anchor.quote);
  if (matches.length === 0) {
    return { ok: false, reason: "orphaned" };
  }

  const best = matches.reduce(
    (winners: { score: number; at: number[] }, at) => {
      const score = contextScore(text, at, anchor);
      if (score > winners.score) {
        return { score, at: [at] };
      }
      if (score === winners.score) {
        winners.at.push(at);
      }
      return winners;
    },
    { score: -1, at: [] },
  );

  const only = best.at.length === 1 ? best.at[0] : undefined;
  if (only === undefined) {
    return { ok: false, reason: "ambiguous", matches: best.at };
  }
  return { ok: true, start: only, end: only + anchor.quote.length };
}
