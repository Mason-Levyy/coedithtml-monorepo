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

const REAL_EDIT_TOKEN = "e".repeat(32);
const REAL_EDIT_LINK = `https://coedit.example/a/${REAL_EDIT_TOKEN}`;

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
  canEdit = true,
): void {
  render(
    <ShareMenu
      feedback={feedback}
      fileName="q3-review.html"
      artifactUrl={ARTIFACT_URL}
      canEdit={canEdit}
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
        fileName="q3-review.html"
        artifactUrl={ARTIFACT_URL}
        canEdit
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

  it("offers no AI handoff to a suggester, who could not publish the result", () => {
    openMenu(FEEDBACK, { view: VIEW_LINK, suggest: SUGGEST_LINK }, false);

    expect(screen.queryByLabelText("Make changes with")).toBeNull();
    expect(screen.queryByRole("button", { name: "Open Claude" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Copy the changes instead" }),
    ).toBeNull();
  });

  it("still lets a suggester copy a link and download the file", () => {
    openMenu(FEEDBACK, { view: VIEW_LINK, suggest: SUGGEST_LINK }, false);

    expect(screen.getByRole("button", { name: "Copy link" })).toBeTruthy();
    expect(screen.getByLabelText("Link permission")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download" })).toBeTruthy();
  });

  it("sends the token instead of the review when the reader can edit", () => {
    const opened: string[] = [];
    vi.stubGlobal("open", (url: string) => {
      opened.push(url);
      return null;
    });
    openMenu(FEEDBACK, { edit: REAL_EDIT_LINK });

    fireEvent.click(screen.getByRole("button", { name: "Open Claude" }));

    const sent = new URL(opened[0] ?? "").searchParams.get("q") ?? "";
    expect(sent).toContain(REAL_EDIT_TOKEN);
    expect(sent).toContain("coedit_update_artifact");
    expect(sent).not.toContain("1 thread, 1 still open.");
  });

  it("still opens in one click when the review is far too long for a URL", async () => {
    const clipboard = stubClipboard();
    const opened: string[] = [];
    vi.stubGlobal("open", (url: string) => {
      opened.push(url);
      return null;
    });
    openMenu("x".repeat(40_000), { edit: REAL_EDIT_LINK });

    fireEvent.click(screen.getByRole("button", { name: "Open Claude" }));

    expect(opened[0]).toContain("claude.ai/new?q=");
    await waitFor(() => expect(clipboard.written).toEqual([]));
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
