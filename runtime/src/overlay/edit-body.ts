export type BodyEditor = {
  begin(sticky: HTMLElement, markId: string, body: string): void;
  isEditing(): boolean;
  cancel(): void;
  stop(): void;
};

type Editing = {
  sticky: HTMLElement;
  field: HTMLElement;
  markId: string;
  original: string;
};

// Not select-all: a click opens the note, and typing must not wipe what is there.
function caretToEnd(field: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(field);
  range.collapse(false);
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function isUnwritten(original: string, body: string): boolean {
  return original === "" && body.trim() === "";
}

export function createBodyEditor(options: {
  onCommit(markId: string, body: string): void;
  onAbandon(markId: string): void;
  onChanged(): void;
}): BodyEditor {
  let editing: Editing | null = null;

  function close(commit: boolean): void {
    if (editing === null) {
      return;
    }
    const { field, sticky, markId, original } = editing;
    editing = null;

    field.removeAttribute("contenteditable");
    field.removeEventListener("keydown", onKeyDown);
    field.removeEventListener("blur", onBlur);
    sticky.classList.remove("editing");
    document.getSelection()?.removeAllRanges();

    const body = field.textContent ?? "";
    if (isUnwritten(original, body)) {
      options.onAbandon(markId);
    } else if (!commit || body === original) {
      field.textContent = original;
    } else {
      options.onCommit(markId, body);
    }
    options.onChanged();
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
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      close(true);
      return;
    }
    // Swallowed so the artifact's own shortcuts do not fire while typing.
    event.stopPropagation();
  }

  function onBlur(): void {
    close(true);
  }

  return {
    begin(sticky, markId, body) {
      close(true);
      const field = sticky.querySelector<HTMLElement>(".body");
      if (field === null) {
        return;
      }
      editing = { sticky, field, markId, original: body };
      sticky.classList.add("editing");
      // plaintext-only keeps pasted markup out of a body we render as text.
      field.setAttribute("contenteditable", "plaintext-only");
      field.addEventListener("keydown", onKeyDown);
      field.addEventListener("blur", onBlur);
      field.focus();
      caretToEnd(field);
      options.onChanged();
    },
    isEditing: () => editing !== null,
    cancel: () => close(false),
    stop: () => close(false),
  };
}
