export type ChangedSpan = { start: number; end: number; text: string };

export function changedSpan(before: string, after: string): ChangedSpan | null {
  if (before === after) {
    return null;
  }

  let head = 0;
  const shortest = Math.min(before.length, after.length);
  while (head < shortest && before[head] === after[head]) {
    head += 1;
  }

  let tail = 0;
  while (
    tail < shortest - head &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) {
    tail += 1;
  }

  const end = before.length - tail;
  const text = after.slice(head, after.length - tail);
  if (end === head && text.length === 0) {
    return null;
  }
  return { start: head, end, text };
}
