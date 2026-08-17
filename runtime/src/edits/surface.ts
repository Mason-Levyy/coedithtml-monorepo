import { anchorFromText, type TextAnchor } from "@coedithtml/protocol";
import {
  BLOCK_TAGS,
  NON_TEXT_TAGS,
  OVERLAY_HOST_ATTRIBUTE,
} from "../dom/constants";
import { pathToElement } from "../dom/element-path";
import { buildTextIndex } from "../dom/text-index";
import { changedSpan } from "./changed-span";

const EDITING_ATTRIBUTE = "data-coedit-editing";

export const AUTOSAVE_IDLE_MS = 900;

export type EditSurface = {
  arm(on: boolean): void;
  isEditing(): boolean;
  stop(): void;
};

type Editing = {
  block: HTMLElement;
  before: string;
  offset: number;
  documentBefore: string;
  sessionId: string;
  sent: string | null;
};

function newSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function blockFor(target: EventTarget | null): HTMLElement | null {
  const start =
    target instanceof Element ? target : (target as Node)?.parentElement;
  for (
    let element: Element | null = start ?? null;
    element !== null;
    element = element.parentElement
  ) {
    if (
      element.hasAttribute(OVERLAY_HOST_ATTRIBUTE) ||
      NON_TEXT_TAGS.has(element.tagName)
    ) {
      return null;
    }
    if (BLOCK_TAGS.has(element.tagName) && element instanceof HTMLElement) {
      return element;
    }
  }
  return null;
}

function documentAround(
  block: HTMLElement,
): { offset: number; text: string } | null {
  const index = buildTextIndex(document.body);
  const first = index.segments.find((segment) => block.contains(segment.node));
  return first === undefined
    ? null
    : { offset: first.textOffset, text: index.text };
}

export function startEditSurface(options: {
  revision: string;
  canEdit: () => boolean;
  onCommit: (
    anchor: TextAnchor,
    replacement: string,
    sessionId: string,
  ) => void;
  onStateChange: (editing: boolean) => void;
}): EditSurface {
  let armed = false;
  let editing: Editing | null = null;
  let idle = 0;

  // Committing does not end the session, so a caret can save several times
  // over. The baseline it diffs against is the block as it stood when the
  // caret arrived, never as it stood at the last save: the anchor has to keep
  // quoting the author's original words or it resolves onto its own output.
  function commitNow(): void {
    if (editing === null) {
      return;
    }
    const { block, before, offset, documentBefore, sessionId } = editing;
    const after = buildTextIndex(block).text;
    if (after === editing.sent) {
      return;
    }
    const span = changedSpan(before, after);
    if (span === null) {
      return;
    }

    // The anchor quotes what is being replaced, so it is measured against the
    // document as it stood before the caret touched it. Reading it back out of
    // the edited DOM would quote the new words and orphan the entry on reload.
    const anchor = anchorFromText({
      text: documentBefore,
      start: offset + span.start,
      end: offset + span.end,
      path: pathToElement(block),
      revision: options.revision,
    });
    if (anchor !== null) {
      editing.sent = after;
      options.onCommit(anchor, span.text, sessionId);
    }
  }

  function close(commit: boolean): void {
    if (editing === null) {
      return;
    }
    const { block } = editing;
    window.clearTimeout(idle);
    if (commit) {
      commitNow();
    }
    editing = null;

    block.removeAttribute("contenteditable");
    block.removeAttribute(EDITING_ATTRIBUTE);
    block.removeEventListener("keydown", onKeyDown);
    block.removeEventListener("blur", onBlur);
    block.removeEventListener("paste", onPaste);
    block.removeEventListener("input", onInput);
    options.onStateChange(false);
  }

  function onInput(): void {
    window.clearTimeout(idle);
    idle = window.setTimeout(commitNow, AUTOSAVE_IDLE_MS);
  }

  function onKeyDown(event: Event): void {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(false);
      return;
    }
    // Enter is how a browser is invited to split a node or drop in a <br>.
    // This surface changes words, never structure.
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.metaKey || event.ctrlKey) {
        close(true);
      }
      return;
    }
    event.stopPropagation();
  }

  function onBlur(): void {
    close(true);
  }

  // "plaintext-only" is a browser courtesy, not a guarantee — Firefox has no
  // such value and falls back to accepting markup. Pasted HTML is the fastest
  // way to wreck an artifact's styling, so the text is taken by hand.
  function onPaste(event: Event): void {
    if (!(event instanceof ClipboardEvent)) {
      return;
    }
    event.preventDefault();
    const plain = event.clipboardData?.getData("text/plain") ?? "";
    const collapsed = plain.replace(/\s+/g, " ");
    if (collapsed.length === 0) {
      return;
    }
    const selection = document.getSelection();
    if (selection === null || selection.rangeCount === 0) {
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(collapsed);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function begin(block: HTMLElement): void {
    const around = documentAround(block);
    if (around === null) {
      return;
    }
    close(true);
    editing = {
      block,
      before: buildTextIndex(block).text,
      offset: around.offset,
      documentBefore: around.text,
      sessionId: newSessionId(),
      sent: null,
    };
    block.setAttribute("contenteditable", "plaintext-only");
    block.setAttribute(EDITING_ATTRIBUTE, "");
    block.addEventListener("keydown", onKeyDown);
    block.addEventListener("blur", onBlur);
    block.addEventListener("paste", onPaste);
    block.addEventListener("input", onInput);
    block.focus();
    options.onStateChange(true);
  }

  function onPointerDown(event: Event): void {
    if (!armed || !options.canEdit() || editing !== null) {
      return;
    }
    const block = blockFor(event.target);
    if (block === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    begin(block);
  }

  // Double-click needs no mode, so it stays live whenever the link may edit.
  // The default is left alone: the word the browser selects is what puts the
  // caret where it was aimed.
  function onDoubleClick(event: Event): void {
    if (!options.canEdit() || editing !== null) {
      return;
    }
    const block = blockFor(event.target);
    if (block === null) {
      return;
    }
    event.stopPropagation();
    begin(block);
  }

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("dblclick", onDoubleClick, true);

  return {
    arm(on) {
      armed = on;
      if (!on) {
        close(true);
      }
    },
    isEditing: () => editing !== null,
    stop() {
      close(false);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("dblclick", onDoubleClick, true);
    },
  };
}
