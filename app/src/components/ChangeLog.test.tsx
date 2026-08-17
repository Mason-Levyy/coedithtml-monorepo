import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChangeLog } from "./ChangeLog";
import type { EditEntry } from "@/lib/protocol";

function textEdit(overrides: Partial<EditEntry> = {}): EditEntry {
  return {
    kind: "edit",
    id: "e1",
    parentId: null,
    anchor: {
      kind: "text",
      quote: "anyone",
      prefix: "",
      suffix: "",
      path: "p[1]",
      revision: "r1",
    },
    body: "everyone",
    author: { id: "reader-1", displayName: "Priya", source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    rev: 0,
    createdAt: "2026-08-13T12:00:00.000Z",
    ...overrides,
  };
}

function renderLog(
  edits: EditEntry[],
  overrides: {
    canEdit?: boolean;
    onReveal?: () => void;
    onRemove?: () => void;
  },
) {
  return render(
    <ChangeLog
      edits={edits}
      canEdit={overrides.canEdit ?? true}
      onReveal={overrides.onReveal ?? (() => {})}
      onRemove={overrides.onRemove ?? (() => {})}
    />,
  );
}

describe("ChangeLog", () => {
  it("shows nothing at all when the text was never changed", () => {
    const { container } = renderLog([], {});

    expect(container.innerHTML).toBe("");
  });

  it("names who changed it and what it now says", () => {
    renderLog([textEdit()], {});

    expect(screen.getByText("Priya")).toBeTruthy();
    expect(screen.getByText("“everyone”")).toBeTruthy();
  });

  it("does not show the words that were replaced", () => {
    renderLog([textEdit()], {});

    expect(screen.queryByText(/anyone/)).toBeNull();
  });

  it("asks the artifact to scroll to a change when its row is clicked", () => {
    const onReveal = vi.fn();
    renderLog([textEdit()], { onReveal });

    fireEvent.click(screen.getByText("“everyone”"));

    expect(onReveal).toHaveBeenCalledWith("e1");
  });

  it("names an author who never gave a name", () => {
    renderLog(
      [textEdit({ author: { id: "r", displayName: "", source: "anonymous" } })],
      {},
    );

    expect(screen.getByText("Someone")).toBeTruthy();
  });

  it("offers to put the original words back", () => {
    const onRemove = vi.fn();
    renderLog([textEdit()], { onRemove });

    fireEvent.click(screen.getByRole("button", { name: "Put back “anyone”" }));

    expect(onRemove).toHaveBeenCalledWith("e1");
  });

  it("offers nothing to put back on a link that cannot edit", () => {
    renderLog([textEdit()], { canEdit: false });

    expect(screen.queryByRole("button", { name: /Put back/ })).toBeNull();
    expect(screen.getByText("“everyone”")).toBeTruthy();
  });
});
