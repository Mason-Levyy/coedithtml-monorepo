import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StickyEntry } from "@coedithtml/protocol";
import { createBodyEditor, type BodyEditor } from "./edit-body";
import { createStickyElement } from "./sticky-element";

const commits = vi.fn();
const abandons = vi.fn();
const changes = vi.fn();

let editor: BodyEditor;
let element: HTMLElement;

function entry(body: string): StickyEntry {
  return {
    kind: "sticky",
    id: "s1",
    parentId: null,
    anchor: {
      kind: "region",
      path: "p[1]",
      fractionX: 0.5,
      fractionY: 0.5,
      revision: "r1",
    },
    body,
    author: { id: "reader-1", displayName: "Sam", source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    createdAt: "2026-08-04T12:00:00.000Z",
    offsetX: 0,
    offsetY: 0,
    width: null,
    height: null,
    tail: null,
    textSize: "m",
  };
}

function stickyWith(body: string): HTMLElement {
  const sticky = createStickyElement(entry(body));
  const field = sticky.querySelector<HTMLElement>(".body");
  if (field === null) {
    throw new Error("the factory built a sticky with no body");
  }
  field.textContent = body;
  document.body.appendChild(sticky);
  return sticky;
}

function field(): HTMLElement {
  const found = element.querySelector<HTMLElement>(".body");
  if (found === null) {
    throw new Error("the sticky has no body to edit");
  }
  return found;
}

function typeIn(text: string): void {
  field().textContent = text;
  field().dispatchEvent(new Event("input", { bubbles: true }));
}

function blur(): void {
  field().dispatchEvent(new FocusEvent("blur"));
}

function pressKey(key: string, options: KeyboardEventInit = {}): void {
  field().dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, ...options }),
  );
}

beforeEach(() => {
  document.body.innerHTML = "";
  commits.mockReset();
  abandons.mockReset();
  changes.mockReset();
  editor = createBodyEditor({
    onCommit: commits,
    onAbandon: abandons,
    onChanged: changes,
  });
});

describe("editing a sticky in place", () => {
  it("saves what was typed when the reader clicks away", () => {
    element = stickyWith("Swap this chart");
    editor.begin(element, "s1", "Swap this chart");

    typeIn("Use the cohort view");
    blur();

    expect(commits).toHaveBeenCalledWith("s1", "Use the cohort view");
  });

  it("leaves the existing text alone when it opens", () => {
    element = stickyWith("Swap this chart");
    editor.begin(element, "s1", "Swap this chart");

    expect(field().textContent).toBe("Swap this chart");
    expect(document.getSelection()?.isCollapsed).toBe(true);
  });

  it("puts the original back when the reader presses Escape", () => {
    element = stickyWith("Swap this chart");
    editor.begin(element, "s1", "Swap this chart");

    typeIn("half a thought");
    pressKey("Escape");

    expect(field().textContent).toBe("Swap this chart");
    expect(commits).not.toHaveBeenCalled();
  });

  it("commits on the shortcut without waiting for a click away", () => {
    element = stickyWith("");
    editor.begin(element, "s1", "");

    typeIn("Tighten this");
    pressKey("Enter", { metaKey: true });

    expect(commits).toHaveBeenCalledWith("s1", "Tighten this");
  });

  it("throws away a new note nobody wrote in", () => {
    element = stickyWith("");
    editor.begin(element, "s1", "");

    blur();

    expect(abandons).toHaveBeenCalledWith("s1");
    expect(commits).not.toHaveBeenCalled();
  });

  it("throws away a new note holding nothing but blank space", () => {
    element = stickyWith("");
    editor.begin(element, "s1", "");

    typeIn("   ");
    blur();

    expect(abandons).toHaveBeenCalledWith("s1");
  });

  it("keeps an old note the reader deliberately emptied", () => {
    element = stickyWith("Swap this chart");
    editor.begin(element, "s1", "Swap this chart");

    typeIn("");
    blur();

    expect(abandons).not.toHaveBeenCalled();
    expect(commits).toHaveBeenCalledWith("s1", "");
  });

  it("asks for a repaint on every keystroke", () => {
    element = stickyWith("");
    editor.begin(element, "s1", "");
    changes.mockReset();

    typeIn("Swap");
    typeIn("Swap this");

    expect(changes).toHaveBeenCalledTimes(2);
  });

  it("stops asking once the reader has clicked away", () => {
    element = stickyWith("Swap this chart");
    editor.begin(element, "s1", "Swap this chart");
    blur();
    changes.mockReset();

    typeIn("no longer editing");

    expect(changes).not.toHaveBeenCalled();
  });

  it("keeps ordinary keystrokes away from the artifact", () => {
    element = stickyWith("");
    editor.begin(element, "s1", "");
    const seen = vi.fn();
    document.addEventListener("keydown", seen);

    pressKey("k");

    expect(seen).not.toHaveBeenCalled();
    document.removeEventListener("keydown", seen);
  });
});
