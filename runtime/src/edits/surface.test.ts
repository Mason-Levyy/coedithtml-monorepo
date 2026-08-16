import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTOSAVE_IDLE_MS, startEditSurface } from "./surface";

type Surface = ReturnType<typeof startEditSurface>;

function open(canEdit = true) {
  const commits: { quote: string; replacement: string; sessionId: string }[] =
    [];
  const states: boolean[] = [];
  const surface = startEditSurface({
    revision: "r1",
    canEdit: () => canEdit,
    onCommit: (anchor, replacement, sessionId) =>
      commits.push({ quote: anchor.quote, replacement, sessionId }),
    onStateChange: (editing) => states.push(editing),
  });
  return { surface, commits, states };
}

function paragraph(): HTMLElement {
  document.body.innerHTML = "<p>Revenue grew 18% this quarter.</p>";
  const block = document.body.querySelector("p");
  if (block === null) {
    throw new Error("fixture did not render");
  }
  return block;
}

function doubleClick(target: Element): void {
  target.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
}

let live: Surface | null = null;

beforeEach(() => {
  live?.stop();
  live = null;
  document.body.innerHTML = "";
});

describe("the edit surface", () => {
  it("opens a caret on a double-click without any tool being armed", () => {
    const { surface, states } = open();
    live = surface;
    const block = paragraph();

    doubleClick(block);

    expect(block.getAttribute("contenteditable")).toBe("plaintext-only");
    expect(states).toEqual([true]);
  });

  it("stays shut on a double-click when the link may not edit", () => {
    const { surface, states } = open(false);
    live = surface;
    const block = paragraph();

    doubleClick(block);

    expect(block.hasAttribute("contenteditable")).toBe(false);
    expect(states).toEqual([]);
  });

  it("leaves a single click to the artifact until the pen is armed", () => {
    const { surface, states } = open();
    live = surface;
    const block = paragraph();

    block.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(block.hasAttribute("contenteditable")).toBe(false);

    surface.arm(true);
    block.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    expect(block.getAttribute("contenteditable")).toBe("plaintext-only");
    expect(states).toEqual([true]);
  });

  it("does not restart the session when the caret is already open", () => {
    const { surface, states } = open();
    live = surface;
    const block = paragraph();

    doubleClick(block);
    doubleClick(block);

    expect(states).toEqual([true]);
  });

  it("quotes only the words that actually changed", () => {
    const { surface, commits } = open();
    live = surface;
    const block = paragraph();

    doubleClick(block);
    const text = block.firstChild;
    if (text === null) {
      throw new Error("paragraph lost its text");
    }
    text.textContent = "Revenue fell 4% this quarter.";
    block.dispatchEvent(new FocusEvent("blur"));

    // The percent sign survives the rewrite, so it belongs to neither side of
    // the span. A wider quote would be a wider thing to re-anchor later.
    expect(commits).toMatchObject([
      { quote: "grew 18", replacement: "fell 4" },
    ]);
  });

  it("refuses to open on markup that is not somebody's prose", () => {
    const { surface, states } = open();
    live = surface;
    document.body.innerHTML = "<script>const a = 1;</script>";
    const script = document.body.querySelector("script");
    if (script === null) {
      throw new Error("fixture did not render");
    }

    doubleClick(script);

    expect(states).toEqual([]);
  });

  it("lets go of the document when it stops", () => {
    const { surface, states } = open();
    live = surface;
    const block = paragraph();
    surface.stop();
    live = null;

    doubleClick(block);

    expect(states).toEqual([]);
    expect(block.hasAttribute("contenteditable")).toBe(false);
  });
});

describe("the caret closing", () => {
  it("hands the block back to the artifact", () => {
    const { surface } = open();
    live = surface;
    const block = paragraph();

    doubleClick(block);
    block.dispatchEvent(new FocusEvent("blur"));

    expect(block.hasAttribute("contenteditable")).toBe(false);
    expect(block.hasAttribute("data-coedit-editing")).toBe(false);
  });

  it("keeps the words when a commit is abandoned", () => {
    const { surface, commits } = open();
    live = surface;
    const block = paragraph();

    doubleClick(block);
    block.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );

    expect(commits).toEqual([]);
    expect(block.hasAttribute("contenteditable")).toBe(false);
  });

  it("disarming the pen closes a caret it opened", () => {
    const { surface } = open();
    live = surface;
    const block = paragraph();

    surface.arm(true);
    block.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(surface.isEditing()).toBe(true);

    surface.arm(false);

    expect(surface.isEditing()).toBe(false);
  });
});

describe("pasting into an edit", () => {
  // A real browser leaves a caret behind focus(); jsdom does not, so the
  // selection the paste handler reads has to be established here.
  function selectAllOf(block: HTMLElement): void {
    const range = document.createRange();
    range.selectNodeContents(block);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function paste(block: HTMLElement, html: string, plain: string): void {
    const data = new DataTransfer();
    data.setData("text/html", html);
    data.setData("text/plain", plain);
    block.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  it("takes the words and leaves the markup behind", () => {
    const { surface } = open();
    live = surface;
    const block = paragraph();
    doubleClick(block);
    selectAllOf(block);

    paste(block, "<b style='color:red'>bold</b> words", "bold words");

    expect(block.innerHTML).toBe("bold words");
    expect(block.querySelector("b")).toBeNull();
  });

  it("flattens newlines so a paste cannot break the block apart", () => {
    const { surface } = open();
    live = surface;
    const block = paragraph();
    doubleClick(block);
    selectAllOf(block);

    paste(block, "", "one\ntwo\n\nthree");

    expect(block.textContent).toBe("one two three");
  });
});

describe("autosaving while the caret is still open", () => {
  function type(block: HTMLElement, text: string): void {
    const node = block.firstChild;
    if (node === null) {
      throw new Error("paragraph lost its text");
    }
    node.textContent = text;
    block.dispatchEvent(new Event("input", { bubbles: true }));
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves once typing pauses, without taking the caret away", () => {
    const { surface, commits, states } = open();
    live = surface;
    const block = paragraph();
    doubleClick(block);

    type(block, "Revenue fell 18% this quarter.");
    vi.advanceTimersByTime(AUTOSAVE_IDLE_MS);

    expect(commits).toMatchObject([{ quote: "grew", replacement: "fell" }]);
    expect(states).toEqual([true]);
    expect(surface.isEditing()).toBe(true);
  });

  it("holds off while the typing is still going", () => {
    const { surface, commits } = open();
    live = surface;
    const block = paragraph();
    doubleClick(block);

    type(block, "Revenue fell 18% this quarter.");
    vi.advanceTimersByTime(AUTOSAVE_IDLE_MS - 100);
    type(block, "Revenue sank 18% this quarter.");
    vi.advanceTimersByTime(AUTOSAVE_IDLE_MS - 100);

    expect(commits).toEqual([]);
  });

  it("measures every save against the original words, never the last save", () => {
    const { surface, commits } = open();
    live = surface;
    const block = paragraph();
    doubleClick(block);

    type(block, "Revenue fell 18% this quarter.");
    vi.advanceTimersByTime(AUTOSAVE_IDLE_MS);
    type(block, "Revenue fell 4% this quarter.");
    vi.advanceTimersByTime(AUTOSAVE_IDLE_MS);

    expect(commits.map((commit) => commit.quote)).toEqual(["grew", "grew 18"]);
    expect(commits.map((commit) => commit.replacement)).toEqual([
      "fell",
      "fell 4",
    ]);
  });

  it("names one session across every save of one caret visit", () => {
    const { surface, commits } = open();
    live = surface;
    const block = paragraph();
    doubleClick(block);

    type(block, "Revenue fell 18% this quarter.");
    vi.advanceTimersByTime(AUTOSAVE_IDLE_MS);
    type(block, "Revenue fell 4% this quarter.");
    vi.advanceTimersByTime(AUTOSAVE_IDLE_MS);

    expect(new Set(commits.map((commit) => commit.sessionId)).size).toBe(1);
  });

  it("gives a second caret visit its own session", () => {
    const { surface, commits } = open();
    live = surface;
    const block = paragraph();

    doubleClick(block);
    type(block, "Revenue fell 18% this quarter.");
    block.dispatchEvent(new FocusEvent("blur"));
    doubleClick(block);
    type(block, "Revenue sank 18% this quarter.");
    block.dispatchEvent(new FocusEvent("blur"));

    expect(new Set(commits.map((commit) => commit.sessionId)).size).toBe(2);
  });

  it("does not send the same words twice when the caret closes", () => {
    const { surface, commits } = open();
    live = surface;
    const block = paragraph();
    doubleClick(block);

    type(block, "Revenue fell 18% this quarter.");
    vi.advanceTimersByTime(AUTOSAVE_IDLE_MS);
    block.dispatchEvent(new FocusEvent("blur"));

    expect(commits).toHaveLength(1);
  });

  it("stops the timer when the caret is abandoned", () => {
    const { surface, commits } = open();
    live = surface;
    const block = paragraph();
    doubleClick(block);

    type(block, "Revenue fell 18% this quarter.");
    block.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    vi.advanceTimersByTime(AUTOSAVE_IDLE_MS * 4);

    expect(commits).toEqual([]);
  });
});

describe("what the surface reports", () => {
  it("says it is editing only while a caret is open", () => {
    const { surface } = open();
    live = surface;
    const block = paragraph();

    expect(surface.isEditing()).toBe(false);
    doubleClick(block);
    expect(surface.isEditing()).toBe(true);
    block.dispatchEvent(new FocusEvent("blur"));
    expect(surface.isEditing()).toBe(false);
  });

  it("swallows Enter so the browser cannot split the node", () => {
    const { surface } = open();
    live = surface;
    const block = paragraph();
    doubleClick(block);

    const enter = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    const prevented = vi.spyOn(enter, "preventDefault");
    block.dispatchEvent(enter);

    expect(prevented).toHaveBeenCalled();
    expect(surface.isEditing()).toBe(true);
  });
});
