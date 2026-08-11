import {
  effectiveEdge,
  effectiveFill,
  textOn,
  type OverlayEntry,
  type StickyEntry,
} from "@coedithtml/protocol";
import type { Point, Rect } from "./geometry";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const RESIZE_EDGES = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
] as const;

export type ResizeEdge = (typeof RESIZE_EDGES)[number];

export type StickyGeometry = {
  at: Point;
  offsetX: number;
  offsetY: number;
  width: number | null;
  height: number | null;
};

export function boxOf(element: HTMLElement): Rect {
  const box = element.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
}

export function highlightElement(mark: OverlayEntry, rect: Rect): HTMLElement {
  const element = document.createElement("div");
  element.className = "highlight";
  element.dataset.mark = mark.id;
  element.style.background = effectiveFill(mark);
  element.style.left = `${rect.x}px`;
  element.style.top = `${rect.y}px`;
  element.style.width = `${rect.width}px`;
  element.style.height = `${rect.height}px`;
  return element;
}

function handleElement(edge: string): HTMLElement {
  const handle = document.createElement("span");
  handle.className = "handle";
  handle.dataset.edge = edge;
  return handle;
}

export const TAIL_NODES = ["tip", "first", "second"] as const;

export type TailNodeName = (typeof TAIL_NODES)[number];

function nodeElement(name: TailNodeName): HTMLElement {
  const node = document.createElement("span");
  node.className = name === "tip" ? "handle tip" : "node";
  node.dataset.node = name;
  if (name === "tip") {
    node.dataset.edge = "tail";
  }
  return node;
}

function shapeElement(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("class", "shape");
  svg.appendChild(document.createElementNS(SVG_NAMESPACE, "path"));
  return svg;
}

export function createStickyElement(mark: StickyEntry): HTMLElement {
  const element = document.createElement("div");
  element.className = "sticky";
  element.dataset.mark = mark.id;
  element.appendChild(shapeElement());

  // Handles sit outside the box, so only this inner element may clip.
  const content = document.createElement("div");
  content.className = "content";
  element.appendChild(content);

  const body = document.createElement("span");
  body.className = "body";
  content.appendChild(body);

  const author = document.createElement("span");
  author.className = "author";
  content.appendChild(author);

  for (const edge of RESIZE_EDGES) {
    element.appendChild(handleElement(edge));
  }
  for (const name of TAIL_NODES) {
    element.appendChild(nodeElement(name));
  }
  return element;
}

function childBy(element: HTMLElement, className: string): HTMLElement | null {
  return element.querySelector<HTMLElement>(`.${className}`);
}

// Written rather than rebuilt: a gesture holds the element it is dragging.
export function updateStickyElement(
  element: HTMLElement,
  mark: StickyEntry,
  geometry: StickyGeometry,
): void {
  element.style.left = `${geometry.at.x + geometry.offsetX}px`;
  element.style.top = `${geometry.at.y + geometry.offsetY}px`;
  element.style.width =
    geometry.width === null ? "" : `${Math.round(geometry.width)}px`;
  element.style.height =
    geometry.height === null ? "" : `${Math.round(geometry.height)}px`;
  element.style.color = textOn(effectiveFill(mark));

  const body = childBy(element, "body");
  // Left alone mid-edit, or a repaint would overwrite what is being typed.
  if (
    body !== null &&
    body.textContent !== mark.body &&
    !element.classList.contains("editing")
  ) {
    body.textContent = mark.body;
  }
  const author = childBy(element, "author");
  if (author !== null && author.textContent !== mark.author.displayName) {
    author.textContent = mark.author.displayName;
  }
}

export function paintStickyPath(
  element: HTMLElement,
  mark: StickyEntry,
  d: string,
): void {
  const path = element.querySelector("path");
  if (path === null) {
    return;
  }
  path.setAttribute("d", d);
  path.setAttribute("fill", effectiveFill(mark));
  path.setAttribute("stroke", effectiveEdge(mark));
}

export function placeTailNode(
  element: HTMLElement,
  name: TailNodeName,
  at: Point | null,
): void {
  const node = element.querySelector<HTMLElement>(`[data-node="${name}"]`);
  if (node === null) {
    return;
  }
  node.style.display = at === null ? "none" : "";
  if (at !== null) {
    node.style.left = `${at.x}px`;
    node.style.top = `${at.y}px`;
  }
}
