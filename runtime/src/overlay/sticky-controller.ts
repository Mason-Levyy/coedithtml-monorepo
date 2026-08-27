import {
  nextStickyTextSize,
  type EntryPatch,
  type StickyEntry,
  type TailTip,
} from "@coedithtml/protocol";
import type { TextIndex } from "../dom/text-index";
import { beginGesture, type Gesture, type GestureUpdate } from "./gesture";
import type { Point, Rect } from "./geometry";
import { locateAnchor } from "./geometry";
import type { OverlayLayer } from "./layer";
import { emptyPlacement, type Placement } from "./paint";
import {
  RESIZE_EDGES,
  boxOf,
  createStickyElement,
  paintStickyShape,
  toolOf,
  updateStickyElement,
  type ResizeEdge,
  type StickyGeometry,
  type StickyTool,
} from "./sticky-element";
import { defaultTip, isInside, resizeRect } from "./sticky-geometry";

export type StickyOverride = {
  markId: string;
  offsetX: number;
  offsetY: number;
  width: number | null;
  height: number | null;
  tailTip: TailTip | null;
};

export type StickyView = {
  reconcile(
    index: TextIndex,
    marks: StickyEntry[],
    override: StickyOverride | null,
  ): Placement;
  elementFor(markId: string): HTMLElement | null;
  markIdOf(element: HTMLElement): string | null;
  rectOf(markId: string): Rect | null;
  clear(): void;
};

export type StickyGestures = {
  isDragging(): boolean;
  stop(): void;
};

function geometryFor(
  mark: StickyEntry,
  at: Point,
  override: StickyOverride | null,
): StickyGeometry {
  const source = override?.markId === mark.id ? override : mark;
  return {
    at,
    offsetX: source.offsetX,
    offsetY: source.offsetY,
    width: source.width,
    height: source.height,
  };
}

function tipFor(
  mark: StickyEntry,
  override: StickyOverride | null,
): TailTip | null {
  return override?.markId === mark.id ? override.tailTip : mark.tail;
}

export function createStickyView(layer: OverlayLayer): StickyView {
  const held = new Map<string, HTMLElement>();

  function drop(markId: string): void {
    held.get(markId)?.remove();
    held.delete(markId);
  }

  return {
    reconcile(index, marks, override) {
      const placement = emptyPlacement();
      const seen = new Set<string>();

      for (const mark of marks) {
        const located = locateAnchor(index, mark.anchor);
        if (located.at === null) {
          placement[located.why].push(mark.id);
          drop(mark.id);
          continue;
        }
        seen.add(mark.id);
        if (!located.onScreen) {
          placement.offscreen.push(mark.id);
        }

        let element = held.get(mark.id);
        if (element === undefined) {
          element = layer.stickies.appendChild(createStickyElement(mark));
          held.set(mark.id, element);
        }
        updateStickyElement(
          element,
          mark,
          geometryFor(mark, located.at, override),
        );
        paintStickyShape(element, mark, tipFor(mark, override));
      }

      for (const markId of [...held.keys()]) {
        if (!seen.has(markId)) {
          drop(markId);
        }
      }
      return placement;
    },
    elementFor: (markId) => held.get(markId) ?? null,
    markIdOf: (element) =>
      element.closest<HTMLElement>(".sticky")?.dataset.mark ?? null,
    rectOf: (markId) => {
      const element = held.get(markId);
      return element === undefined ? null : boxOf(element);
    },
    clear: () => {
      for (const markId of [...held.keys()]) {
        drop(markId);
      }
    },
  };
}

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
  onRemove(markId: string): void;
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

  function useTool(tool: StickyTool, markId: string): void {
    if (tool === "remove") {
      options.onRemove(markId);
      return;
    }
    if (tool === "fit") {
      options.onPatch(markId, { width: null, height: null });
      return;
    }
    const mark = options.markById(markId);
    if (mark !== null) {
      options.onPatch(markId, { textSize: nextStickyTextSize(mark.textSize) });
    }
  }

  function overrideFor(
    box: Rect,
    tailTip: TailTip | null,
  ): StickyOverride | null {
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
    return overrideFor(startBox, {
      x: live.startTip.x + update.dx,
      y: live.startTip.y + update.dy,
    });
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
    const tip = {
      x: live.startTip.x + update.dx,
      y: live.startTip.y + update.dy,
    };
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
    const tool = toolOf(target);
    if (tool !== null) {
      event.stopPropagation();
      event.preventDefault();
      useTool(tool, markId);
      return;
    }
    const intent = intentOf(target);
    if (element.classList.contains("editing") && intent?.kind === "move") {
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
      width: painted.width,
      height: painted.height,
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
      startTip: mark.tail ?? defaultTip(startBox),
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
    for (const id of selectedMarkIds) {
      options.onRemove(id);
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
