import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShareMenu } from "./ShareMenu";

const FEEDBACK = "# Feedback on q3-review.html\n\n1 thread, 1 still open.\n";

function stubClipboard(): { written: string[] } {
  const written: string[] = [];
  vi.stubGlobal("navigator", {
    clipboard: {
      writeText: (text: string) => {
        written.push(text);
        return Promise.resolve();
      },
    },
  });
  return { written };
}

function openMenu(feedback = FEEDBACK): void {
  render(<ShareMenu feedback={feedback} />);
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
}

describe("ShareMenu", () => {
  it("keeps both actions behind one control until it is opened", () => {
    render(<ShareMenu feedback={FEEDBACK} />);

    expect(screen.queryByText("Copy link")).toBeNull();
    expect(screen.queryByText("Copy feedback for AI tool")).toBeNull();
  });

  it("copies the page link", async () => {
    const clipboard = stubClipboard();
    openMenu();

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() =>
      expect(clipboard.written).toEqual([window.location.href]),
    );
  });

  it("copies the rendered feedback, not the link", async () => {
    const clipboard = stubClipboard();
    openMenu();

    fireEvent.click(
      screen.getByRole("button", { name: "Copy feedback for AI tool" }),
    );

    await waitFor(() => expect(clipboard.written).toEqual([FEEDBACK]));
  });

  it("reports each copy separately rather than as one state", async () => {
    stubClipboard();
    openMenu();

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await screen.findByRole("button", { name: "Copied" });
    expect(
      screen.getByRole("button", { name: "Copy feedback for AI tool" }),
    ).toBeTruthy();
  });

  it("refuses to copy an empty document and says why", () => {
    openMenu("");

    const copy = screen.getByRole("button", {
      name: "Copy feedback for AI tool",
    });

    expect(copy).toHaveProperty("disabled", true);
    expect(screen.getByText("No feedback to copy yet.")).toBeTruthy();
  });

  it("says when the clipboard refused rather than claiming success", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: () => Promise.reject(new Error("denied")),
      },
    });
    openMenu();

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    expect(
      await screen.findByRole("button", { name: "Press Ctrl+C" }),
    ).toBeTruthy();
  });
});
