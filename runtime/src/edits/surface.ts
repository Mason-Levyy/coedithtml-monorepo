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
};

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
  onCommit: (anchor: TextAnchor, replacement: string) => void;
  onStateChange: (editing: boolean) => void;
}): EditSurface {
  let armed = false;
  let editing: Editing | null = null;

  function close(commit: boolean): void {
    if (editing === null) {
      return;
    }
    const { block, before, offset, documentBefore } = editing;
    editing = null;

    block.removeAttribute("contenteditable");
    block.removeAttribute(EDITING_ATTRIBUTE);
    block.removeEventListener("keydown", onKeyDown);
    block.removeEventListener("blur", onBlur);
    options.onStateChange(false);

    const after = buildTextIndex(block).text;
    const span = commit ? changedSpan(before, after) : null;
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
      options.onCommit(anchor, span.text);
    }
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
    };
    block.setAttribute("contenteditable", "plaintext-only");
    block.setAttribute(EDITING_ATTRIBUTE, "");
    block.addEventListener("keydown", onKeyDown);
    block.addEventListener("blur", onBlur);
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

  document.addEventListener("pointerdown", onPointerDown, true);

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
    },
  };
}
