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

describe("ChangeLog", () => {
  it("shows nothing at all when the text was never changed", () => {
    const { container } = render(<ChangeLog edits={[]} onReveal={() => {}} />);

    expect(container.innerHTML).toBe("");
  });

  it("names who changed it and what it now says", () => {
    render(<ChangeLog edits={[textEdit()]} onReveal={() => {}} />);

    expect(screen.getByText("Priya")).toBeTruthy();
    expect(screen.getByText("“everyone”")).toBeTruthy();
  });

  it("does not show the words that were replaced", () => {
    render(<ChangeLog edits={[textEdit()]} onReveal={() => {}} />);

    expect(screen.queryByText(/anyone/)).toBeNull();
  });

  it("counts the changes", () => {
    render(
      <ChangeLog
        edits={[textEdit(), textEdit({ id: "e2" })]}
        onReveal={() => {}}
      />,
    );

    expect(screen.getByText("Changes · 2")).toBeTruthy();
  });

  it("asks the artifact to scroll to a change when its row is clicked", () => {
    const onReveal = vi.fn();
    render(<ChangeLog edits={[textEdit()]} onReveal={onReveal} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onReveal).toHaveBeenCalledWith("e1");
  });

  it("names an author who never gave a name", () => {
    render(
      <ChangeLog
        edits={[
          textEdit({
            author: { id: "r", displayName: "", source: "anonymous" },
          }),
        ]}
        onReveal={() => {}}
      />,
    );

    expect(screen.getByText("Someone")).toBeTruthy();
  });
});
