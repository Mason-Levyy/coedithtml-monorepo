import type { EntryPatch, StickyEntry, TailTip } from "@coedithtml/protocol";
import { centreOf } from "./bubble-path";
import { RESIZE_EDGES, type ResizeEdge } from "./elements";
import { beginGesture, type Gesture, type GestureUpdate } from "./gesture";
import type { Rect } from "./geometry";
import type { OverlayLayer } from "./layer";
import { isInside, resizeRect } from "./resize-math";
import { toolOf } from "./sticky-tools";
import type { StickyOverride, StickyView } from "./sticky-view";

export type StickyGestures = {
  isDragging(): boolean;
  stop(): void;
};

type Intent =
  { kind: "move" } | { kind: "resize"; edge: ResizeEdge } | { kind: "tail" };

type Live = {
  markId: string;
  intent: Intent;
  startBox: Rect;
  startTip: TailTip;
  gesture: Gesture;
};

function isResizeEdge(value: string): value is ResizeEdge {
  return RESIZE_EDGES.some((edge) => edge === value);
}

function intentOf(target: HTMLElement): Intent | null {
  const edge = target.closest<HTMLElement>(".handle")?.dataset.edge;
  if (edge === undefined) {
    return { kind: "move" };
  }
  if (edge === "tail") {
    return { kind: "tail" };
  }
  return isResizeEdge(edge) ? { kind: "resize", edge } : null;
}

export function startStickyGestures(options: {
  layer: OverlayLayer;
  view: StickyView;
  markById(markId: string): StickyEntry | null;
  setOverride(override: StickyOverride | null): void;
  onPatch(markId: string, patch: EntryPatch): void;
  onSelect(markId: string): void;
  onEdit(sticky: HTMLElement, markId: string, body: string): void;
  onRemove?: (markId: string) => void;
  canWrite(): boolean;
}): StickyGestures {
  const surface = options.layer.stickies;
  const root = surface.getRootNode();
  const shadowRoot = root instanceof ShadowRoot ? root : null;
  let live: Live | null = null;
  let swallowClick = false;
  const selectedMarkIds = new Set<string>();

  function updateSelectionVisuals(): void {
    const elements = surface.querySelectorAll<HTMLElement>(".sticky");
    elements.forEach((el) => {
      const id = options.view.markIdOf(el);
      if (id !== null) {
        el.classList.toggle("selected", selectedMarkIds.has(id));
      }
    });
  }

  function draggedTip(update: GestureUpdate, from: TailTip): TailTip {
    return { x: from.x + update.dx, y: from.y + update.dy };
  }

  function overrideFor(box: Rect, tailTip: TailTip | null) {
    if (live === null) {
      return null;
    }
    return {
      markId: live.markId,
      offsetX: box.x,
      offsetY: box.y,
      width: box.width,
      height: box.height,
      tailTip,
    };
  }

  function previewOf(update: GestureUpdate): StickyOverride | null {
    if (live === null) {
      return null;
    }
    const { intent, startBox } = live;
    if (intent.kind === "move") {
      return overrideFor(
        { ...startBox, x: startBox.x + update.dx, y: startBox.y + update.dy },
        null,
      );
    }
    if (intent.kind === "resize") {
      return overrideFor(
        resizeRect(
          startBox,
          intent.edge,
          { x: update.dx, y: update.dy },
          update.shiftKey,
        ),
        null,
      );
    }
    return overrideFor(startBox, draggedTip(update, live.startTip));
  }

  function committed(update: GestureUpdate): EntryPatch | null {
    if (live === null || !update.moved) {
      return null;
    }
    const { intent, startBox } = live;
    if (intent.kind === "move") {
      return {
        offsetX: startBox.x + update.dx,
        offsetY: startBox.y + update.dy,
      };
    }
    if (intent.kind === "resize") {
      const box = resizeRect(
        startBox,
        intent.edge,
        { x: update.dx, y: update.dy },
        update.shiftKey,
      );
      return {
        offsetX: box.x,
        offsetY: box.y,
        width: box.width,
        height: box.height,
      };
    }
    const tip = draggedTip(update, live.startTip);
    const box = { x: 0, y: 0, width: startBox.width, height: startBox.height };
    return { tail: isInside(box, tip) ? null : tip };
  }

  function release(): void {
    const element = live === null ? null : options.view.elementFor(live.markId);
    element?.classList.remove("dragging");
    live = null;
    options.setOverride(null);
  }

  function onPointerDown(event: Event): void {
    if (!(event instanceof PointerEvent) || !options.canWrite()) {
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLElement) || live !== null) {
      return;
    }
    const markId = options.view.markIdOf(target);
    const element = markId === null ? null : options.view.elementFor(markId);
    if (markId === null || element === null) {
      if (selectedMarkIds.size > 0) {
        selectedMarkIds.clear();
        updateSelectionVisuals();
      }
      return;
    }
    const intent = intentOf(target);
    if (element.classList.contains("editing") && intent?.kind === "move") {
      return;
    }
    if (toolOf(target) !== null) {
      event.stopPropagation();
      return;
    }
    const mark = options.markById(markId);
    const painted = options.view.rectOf(markId);
    if (mark === null || painted === null || intent === null) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    if (event.ctrlKey || event.metaKey) {
      if (selectedMarkIds.has(markId)) {
        selectedMarkIds.delete(markId);
      } else {
        selectedMarkIds.add(markId);
      }
    } else {
      if (!selectedMarkIds.has(markId)) {
        selectedMarkIds.clear();
        selectedMarkIds.add(markId);
      }
    }
    updateSelectionVisuals();

    const startBox: Rect = {
      x: mark.offsetX,
      y: mark.offsetY,
      width: mark.width ?? painted.width,
      height: mark.height ?? painted.height,
    };

    const multiStart = new Map<string, { startX: number; startY: number }>();
    if (intent.kind === "move" && selectedMarkIds.has(markId)) {
      for (const id of selectedMarkIds) {
        const m = options.markById(id);
        if (m !== null) {
          multiStart.set(id, { startX: m.offsetX, startY: m.offsetY });
        }
      }
    }

    const gesture = beginGesture(event, element, {
      onUpdate: (update) => options.setOverride(previewOf(update)),
      onCommit: (update) => {
        const patch = committed(update);
        release();
        swallowClick = true;
        if (patch !== null) {
          if (intent.kind === "move" && multiStart.size > 1) {
            for (const [id, start] of multiStart) {
              options.onPatch(id, {
                offsetX: start.startX + update.dx,
                offsetY: start.startY + update.dy,
              });
            }
          } else {
            options.onPatch(markId, patch);
          }
          return;
        }
        if (!update.moved) {
          options.onSelect(markId);
          options.onEdit(element, markId, options.markById(markId)?.body ?? "");
        }
      },
      onCancel: () => {
        release();
        swallowClick = true;
      },
    });
    if (gesture === null) {
      return;
    }
    live = {
      markId,
      intent,
      startBox,
      startTip: mark.tail ?? centreOf(startBox),
      gesture,
    };
    element.classList.add("dragging");
  }

  function onClick(event: Event): void {
    if (swallowClick) {
      swallowClick = false;
      event.stopPropagation();
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Delete" && event.key !== "Backspace") {
      return;
    }
    if (selectedMarkIds.size === 0) {
      return;
    }
    const hostFocus = document.activeElement;
    const hostHasItsOwnFocus =
      hostFocus !== null &&
      hostFocus !== document.body &&
      hostFocus !== shadowRoot?.host;
    if (hostHasItsOwnFocus) {
      return;
    }
    const active = shadowRoot?.activeElement ?? null;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable)
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    for (const id of [...selectedMarkIds]) {
      options.onRemove?.(id);
    }
    selectedMarkIds.clear();
    updateSelectionVisuals();
  }

  function onWindowPointerDown(event: Event): void {
    if (!(event instanceof PointerEvent)) {
      return;
    }
    const origin = event.composedPath()[0];
    if (origin instanceof HTMLElement && surface.contains(origin)) {
      return;
    }
    if (selectedMarkIds.size > 0) {
      selectedMarkIds.clear();
      updateSelectionVisuals();
    }
  }

  surface.addEventListener("pointerdown", onPointerDown);
  surface.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("pointerdown", onWindowPointerDown, true);

  return {
    isDragging: () => live !== null,
    stop: () => {
      live?.gesture.end();
      release();
      surface.removeEventListener("pointerdown", onPointerDown);
      surface.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onWindowPointerDown, true);
    },
  };
}
