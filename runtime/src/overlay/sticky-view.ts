import type { StickyEntry, TailTip } from "@coedithtml/protocol";
import type { TextIndex } from "../dom/text-index";
import { bubblePath, centreOf, tailNodes } from "./bubble-path";
import {
  boxOf,
  createStickyElement,
  paintStickyPath,
  placeTailNode,
  updateStickyElement,
  type StickyGeometry,
} from "./elements";
import { pointForAnchor, type Rect } from "./geometry";
import type { OverlayLayer } from "./layer";

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
  ): string[];
  elementFor(markId: string): HTMLElement | null;
  markIdOf(element: HTMLElement): string | null;
  rectOf(markId: string): Rect | null;
  clear(): void;
};

function geometryFor(
  mark: StickyEntry,
  at: { x: number; y: number },
  override: StickyOverride | null,
): StickyGeometry {
  if (override === null || override.markId !== mark.id) {
    return {
      at,
      offsetX: mark.offsetX,
      offsetY: mark.offsetY,
      width: mark.width,
      height: mark.height,
    };
  }
  return {
    at,
    offsetX: override.offsetX,
    offsetY: override.offsetY,
    width: override.width,
    height: override.height,
  };
}

function tipFor(
  mark: StickyEntry,
  override: StickyOverride | null,
): TailTip | null {
  if (override !== null && override.markId === mark.id) {
    return override.tailTip;
  }
  return mark.tail;
}

export function createStickyView(layer: OverlayLayer): StickyView {
  const held = new Map<string, HTMLElement>();

  function drop(markId: string): void {
    held.get(markId)?.remove();
    held.delete(markId);
  }

  // The tip is stored in the sticky's own space, so the shape is drawn there too.
  function paintShape(
    element: HTMLElement,
    mark: StickyEntry,
    tip: TailTip | null,
  ): void {
    const size = boxOf(element);
    paintStickyPath(element, mark, bubblePath(size, tip));

    const nodes = tailNodes(size, tip);
    placeTailNode(element, "tip", tip ?? centreOf(size));
    placeTailNode(element, "first", nodes?.first ?? null);
    placeTailNode(element, "second", nodes?.second ?? null);
  }

  return {
    reconcile(index, marks, override) {
      const orphaned: string[] = [];
      const seen = new Set<string>();

      for (const mark of marks) {
        const at = pointForAnchor(index, mark.anchor);
        if (at === null) {
          orphaned.push(mark.id);
          drop(mark.id);
          continue;
        }
        seen.add(mark.id);

        let element = held.get(mark.id);
        if (element === undefined) {
          element = layer.stickies.appendChild(createStickyElement(mark));
          held.set(mark.id, element);
        }
        updateStickyElement(element, mark, geometryFor(mark, at, override));
        paintShape(element, mark, tipFor(mark, override));
      }

      for (const markId of [...held.keys()]) {
        if (!seen.has(markId)) {
          drop(markId);
        }
      }
      return orphaned;
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
