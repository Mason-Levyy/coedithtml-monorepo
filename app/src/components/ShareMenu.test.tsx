import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LinkPermission } from "@/lib/link-permission";
import { ShareMenu } from "./ShareMenu";

const FEEDBACK = "# Feedback on q3-review.html\n\n1 thread, 1 still open.\n";

const VIEW_LINK = "https://coedit.example/a/view-token";
const SUGGEST_LINK = "https://coedit.example/a/suggest-token";
const EDIT_LINK = "https://coedit.example/a/edit-token";

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

const ARTIFACT_URL = "https://sandbox.test/aaaa?r=9f2c";

function openMenu(
  feedback = FEEDBACK,
  shareLinks: Partial<Record<LinkPermission, string>> = { view: VIEW_LINK },
): void {
  render(
    <ShareMenu
      feedback={feedback}
      artifactUrl={ARTIFACT_URL}
      shareLinks={shareLinks}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
}

describe("ShareMenu", () => {
  it("keeps both actions behind one control until it is opened", () => {
    render(
      <ShareMenu
        feedback={FEEDBACK}
        artifactUrl={ARTIFACT_URL}
        shareLinks={{ view: VIEW_LINK }}
      />,
    );

    expect(screen.queryByText("Copy link")).toBeNull();
    expect(screen.queryByText("Copy the changes instead")).toBeNull();
  });

  it("copies the sole link when the reader has no choice of permission", async () => {
    const clipboard = stubClipboard();
    openMenu();

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => expect(clipboard.written).toEqual([VIEW_LINK]));
    expect(screen.queryByLabelText("Link permission")).toBeNull();
  });

  it("defaults the picker to the reader's own permission and copies it", async () => {
    const clipboard = stubClipboard();
    openMenu(FEEDBACK, {
      view: VIEW_LINK,
      suggest: SUGGEST_LINK,
      edit: EDIT_LINK,
    });

    expect(screen.getByLabelText("Link permission")).toHaveProperty(
      "value",
      "edit",
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => expect(clipboard.written).toEqual([EDIT_LINK]));
  });

  it("offers only permissions at or below the reader's own", () => {
    openMenu(FEEDBACK, { view: VIEW_LINK, suggest: SUGGEST_LINK });

    const options = within(screen.getByLabelText("Link permission"))
      .getAllByRole<HTMLOptionElement>("option")
      .map((option) => option.value);

    expect(options).toEqual(["view", "suggest"]);
  });

  it("copies the link for the permission the reader picks", async () => {
    const clipboard = stubClipboard();
    openMenu(FEEDBACK, { view: VIEW_LINK, suggest: SUGGEST_LINK });

    fireEvent.change(screen.getByLabelText("Link permission"), {
      target: { value: "view" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => expect(clipboard.written).toEqual([VIEW_LINK]));
  });

  it("copies the rendered feedback, not the link", async () => {
    const clipboard = stubClipboard();
    openMenu();

    fireEvent.click(
      screen.getByRole("button", { name: "Copy the changes instead" }),
    );

    await waitFor(() => expect(clipboard.written).toEqual([FEEDBACK]));
  });

  it("reports each copy separately rather than as one state", async () => {
    stubClipboard();
    openMenu();

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await screen.findByRole("button", { name: "Copied" });
    expect(
      screen.getByRole("button", { name: "Copy the changes instead" }),
    ).toBeTruthy();
  });

  it("opens the chosen tool with the changes already in the prompt", () => {
    const opened: string[] = [];
    vi.stubGlobal("open", (url: string) => {
      opened.push(url);
      return null;
    });
    openMenu();

    fireEvent.click(screen.getByRole("button", { name: "Open Claude" }));

    expect(opened).toHaveLength(1);
    expect(opened[0]).toContain("claude.ai/new?q=");
    expect(new URL(opened[0] ?? "").searchParams.get("q")).toBe(FEEDBACK);
  });

  it("switches tools without changing what it sends", () => {
    const opened: string[] = [];
    vi.stubGlobal("open", (url: string) => {
      opened.push(url);
      return null;
    });
    openMenu();

    fireEvent.change(screen.getByLabelText("Make changes with"), {
      target: { value: "chatgpt" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open ChatGPT" }));

    expect(opened[0]).toContain("chatgpt.com/?q=");
  });

  it("copies a review too long for a URL rather than truncating it", async () => {
    const clipboard = stubClipboard();
    const opened: string[] = [];
    vi.stubGlobal("open", (url: string) => {
      opened.push(url);
      return null;
    });
    const long = "x".repeat(4000);
    openMenu(long);

    fireEvent.click(screen.getByRole("button", { name: "Open Claude" }));

    await waitFor(() => expect(clipboard.written).toEqual([long]));
    expect(opened[0]).not.toContain("?q=");
    await screen.findByRole("button", { name: "Copied — paste it in" });
  });

  it("refuses to copy an empty document and says why", () => {
    openMenu("");

    const copy = screen.getByRole("button", {
      name: "Copy the changes instead",
    });

    expect(copy).toHaveProperty("disabled", true);
    expect(screen.getByText("No changes to send yet.")).toBeTruthy();
  });

  it("warns that the plain download leaves comments out", () => {
    openMenu();

    expect(
      screen.getByText(
        "Your file with text changes applied. Comments and sticky notes are excluded.",
      ),
    ).toBeTruthy();
  });

  it("changes what it promises when a different download is chosen", () => {
    openMenu();

    fireEvent.change(screen.getByLabelText("Download"), {
      target: { value: "everything" },
    });

    expect(
      screen.getByText(
        "Your file with text changes applied, sticky notes shown in place, and comments listed at the end.",
      ),
    ).toBeTruthy();
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
