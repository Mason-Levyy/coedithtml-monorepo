import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTextEditing } from "./useTextEditing";
import type { EditEntry, OverlayEntry, TextAnchor } from "@/lib/protocol";

const READER = { id: "reader-1", displayName: "Priya" };

function anchor(quote: string, path = "p[1]"): TextAnchor {
  return { kind: "text", quote, prefix: "", suffix: "", path, revision: "r1" };
}

function existingEdit(overrides: Partial<EditEntry> = {}): EditEntry {
  return {
    kind: "edit",
    id: "e1",
    parentId: null,
    anchor: anchor("Revenue grew"),
    body: "Revenue fell",
    author: { ...READER, source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    rev: 2,
    createdAt: "2026-08-13T12:00:00.000Z",
    ...overrides,
  };
}

function setup(entries: OverlayEntry[], canEdit = true) {
  const addEntry = vi.fn();
  const patchEntry = vi.fn();
  const { result } = renderHook(() =>
    useTextEditing({
      entries,
      canEdit,
      color: "#ffd23f",
      reader: READER,
      addEntry,
      patchEntry,
    }),
  );
  return { record: result.current.record, addEntry, patchEntry };
}

describe("useTextEditing", () => {
  it("writes a new edit for a span nobody has touched", () => {
    const { record, addEntry, patchEntry } = setup([]);

    record(anchor("Revenue grew"), "Revenue fell");

    expect(patchEntry).not.toHaveBeenCalled();
    expect(addEntry).toHaveBeenCalledTimes(1);
    expect(addEntry.mock.calls[0]?.[0]).toMatchObject({
      kind: "edit",
      body: "Revenue fell",
      rev: 0,
    });
  });

  it("moves the edit already on a span rather than stacking a second", () => {
    const { record, addEntry, patchEntry } = setup([existingEdit()]);

    record(anchor("Revenue grew"), "Revenue held");

    expect(addEntry).not.toHaveBeenCalled();
    expect(patchEntry).toHaveBeenCalledWith("e1", {
      ifRev: 2,
      body: "Revenue held",
    });
  });

  it("sends the revision it saw, so a racing writer is caught", () => {
    const { record, patchEntry } = setup([existingEdit({ rev: 7 })]);

    record(anchor("Revenue grew"), "Revenue held");

    expect(patchEntry.mock.calls[0]?.[1]).toMatchObject({ ifRev: 7 });
  });

  it("treats the same words in a different place as a different span", () => {
    const { record, addEntry } = setup([existingEdit()]);

    record(anchor("Revenue grew", "p[9]"), "Revenue held");

    expect(addEntry).toHaveBeenCalledTimes(1);
  });

  it("writes nothing at all from a link that may only suggest", () => {
    const { record, addEntry, patchEntry } = setup([], false);

    record(anchor("Revenue grew"), "Revenue fell");

    expect(addEntry).not.toHaveBeenCalled();
    expect(patchEntry).not.toHaveBeenCalled();
  });
});
