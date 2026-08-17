import { isEdit, type EntryPatch, type OverlayEntry } from "@/lib/protocol";

export type Reversal =
  | { kind: "add"; entry: OverlayEntry }
  | { kind: "remove"; id: string }
  | { kind: "patch"; id: string; patch: EntryPatch };

export type Step = {
  undo: Reversal[];
  redo: Reversal[];
  touchesText: boolean;
};

// ifRev is deliberately dropped. It exists to catch two people typing over each
// other in the same second; an undo is a deliberate act minutes later, and
// refusing it as stale would tell the reader their own key did nothing.
function inversePatch(
  before: OverlayEntry,
  patch: EntryPatch,
): EntryPatch | null {
  const inverse: EntryPatch = {};
  let changed = false;

  function restore<Field extends keyof EntryPatch>(
    field: Field,
    value: EntryPatch[Field],
  ): void {
    if (patch[field] !== undefined) {
      inverse[field] = value;
      changed = true;
    }
  }

  const floating = before.kind === "sticky" ? before : null;
  restore("anchor", before.anchor);
  restore("body", before.body);
  restore("color", before.color);
  restore("fill", before.fill);
  restore("status", before.status);
  restore("offsetX", floating?.offsetX ?? 0);
  restore("offsetY", floating?.offsetY ?? 0);
  restore("width", floating?.width ?? null);
  restore("height", floating?.height ?? null);
  restore("tail", floating?.tail ?? null);

  return changed ? inverse : null;
}

function threadOf(entries: OverlayEntry[], id: string): OverlayEntry[] {
  return entries.filter((entry) => entry.id === id || entry.parentId === id);
}

export function stepForAdd(entry: OverlayEntry): Step {
  return {
    undo: [{ kind: "remove", id: entry.id }],
    redo: [{ kind: "add", entry }],
    touchesText: isEdit(entry),
  };
}

export function stepForRemove(
  entries: OverlayEntry[],
  id: string,
): Step | null {
  const removed = threadOf(entries, id);
  if (removed.length === 0) {
    return null;
  }
  return {
    undo: removed.map((entry) => ({ kind: "add" as const, entry })),
    redo: [{ kind: "remove", id }],
    touchesText: removed.some(isEdit),
  };
}

export function stepForPatch(
  entries: OverlayEntry[],
  id: string,
  patch: EntryPatch,
): Step | null {
  const before = entries.find((entry) => entry.id === id);
  if (before === undefined) {
    return null;
  }
  const inverse = inversePatch(before, patch);
  if (inverse === null) {
    return null;
  }
  return {
    undo: [{ kind: "patch", id, patch: inverse }],
    redo: [{ kind: "patch", id, patch }],
    touchesText: isEdit(before),
  };
}
