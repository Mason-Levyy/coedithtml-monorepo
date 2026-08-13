import {
  effectiveEdge,
  effectiveFill,
  textOn,
  type StickyEntry,
  type TailTip,
} from "@coedithtml/protocol";
import type { Point, Rect } from "./geometry";
import {
  bubblePath,
  defaultTip,
  tailNodes,
  RESIZE_EDGES,
  type ResizeEdge,
} from "./sticky-geometry";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export { RESIZE_EDGES, type ResizeEdge };

export type StickyGeometry = {
  at: Point;
  offsetX: number;
  offsetY: number;
  width: number | null;
  height: number | null;
};

export const TAIL_NODES = ["tip", "first", "second"] as const;

export type TailNodeName = (typeof TAIL_NODES)[number];

const STICKY_TOOLS = ["remove", "fit"] as const;

export type StickyTool = (typeof STICKY_TOOLS)[number];

const TOOL_LABEL: Record<StickyTool, string> = {
  remove: "Delete this note",
  fit: "Shrink to fit the text",
};

const TOOL_GLYPH: Record<StickyTool, string> = { remove: "✕", fit: "⤡" };

function toolElement(tool: StickyTool): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tool";
  button.dataset.tool = tool;
  button.title = TOOL_LABEL[tool];
  button.setAttribute("aria-label", TOOL_LABEL[tool]);
  button.textContent = TOOL_GLYPH[tool];
  return button;
}

export function stickyToolbar(): HTMLElement {
  const tools = document.createElement("div");
  tools.className = "tools";
  for (const tool of STICKY_TOOLS) {
    tools.appendChild(toolElement(tool));
  }
  return tools;
}

export function toolOf(target: HTMLElement): StickyTool | null {
  const named = target.closest<HTMLElement>(".tool")?.dataset.tool;
  return STICKY_TOOLS.find((tool) => tool === named) ?? null;
}

export function boxOf(element: HTMLElement): Rect {
  const box = element.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
}

function handleElement(edge: string): HTMLElement {
  const handle = document.createElement("span");
  handle.className = "handle";
  handle.dataset.edge = edge;
  return handle;
}

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

  const content = document.createElement("div");
  content.className = "content";
  element.appendChild(content);

  const body = document.createElement("span");
  body.className = "body";
  content.appendChild(body);

  const author = document.createElement("span");
  author.className = "author";
  content.appendChild(author);

  element.appendChild(stickyToolbar());

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

const TOOLS_HEADROOM = 34;

export function updateStickyElement(
  element: HTMLElement,
  mark: StickyEntry,
  geometry: StickyGeometry,
): void {
  const top = geometry.at.y + geometry.offsetY;
  element.style.left = `${geometry.at.x + geometry.offsetX}px`;
  element.style.top = `${top}px`;
  element.classList.toggle("low-room", top < TOOLS_HEADROOM);
  element.style.width =
    geometry.width === null ? "" : `${Math.round(geometry.width)}px`;
  element.style.height =
    geometry.height === null ? "" : `${Math.round(geometry.height)}px`;
  element.style.color = textOn(effectiveFill(mark));
  element.classList.toggle(
    "sized",
    mark.width !== null || mark.height !== null,
  );

  const body = childBy(element, "body");
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

function placeTailNode(
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

export function paintStickyShape(
  element: HTMLElement,
  mark: StickyEntry,
  tip: TailTip | null,
): void {
  const size = boxOf(element);
  const nodes = tailNodes(size, tip);
  const path = element.querySelector("path");
  if (path !== null) {
    path.setAttribute("d", bubblePath(size, tip));
    path.setAttribute("fill", effectiveFill(mark));
    path.setAttribute("stroke", effectiveEdge(mark));
  }
  const edge = effectiveEdge(mark);
  const tipNode = element.querySelector<HTMLElement>('[data-node="tip"]');
  if (tipNode !== null) {
    tipNode.style.borderColor = edge;
    tipNode.style.background = edge;
  }
  placeTailNode(element, "tip", tip ?? defaultTip(size));
  placeTailNode(element, "first", nodes?.first ?? null);
  placeTailNode(element, "second", nodes?.second ?? null);
}
