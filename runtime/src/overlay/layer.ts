import { OVERLAY_HOST_ATTRIBUTE } from "../dom/constants";

const HOST_STYLE =
  "position:fixed;top:0;left:0;width:0;height:0;margin:0;padding:0;border:0;" +
  "z-index:2147483000;pointer-events:none";

const HANDLE_SIZE = 10;
const HANDLE_INSET = -(HANDLE_SIZE / 2 + 1);
const NODE_SIZE = 8;

const SHEET = `
.surface { position: fixed; inset: 0; pointer-events: none; }
.highlight {
  position: fixed;
  border-radius: 2px;
  mix-blend-mode: multiply;
  pointer-events: auto;
  cursor: pointer;
}
.sticky {
  position: fixed;
  box-sizing: border-box;
  display: flex;
  max-width: 220px;
  border-radius: 8px;
  font: 13px/1.45 system-ui, -apple-system, Segoe UI, sans-serif;
  color: #17171a;
  pointer-events: auto;
  cursor: pointer;
}
.sticky[style*="width"] { max-width: none; }
/* The pointer is part of this path, so it leaves the box the content clips to. */
.shape {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}
.shape path {
  stroke-width: 1;
  stroke-linejoin: round;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.22));
}
.content {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  padding: 9px 11px;
  border-radius: inherit;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow: hidden;
}
.body { display: block; }
.author {
  display: block;
  margin-top: 5px;
  font-size: 11px;
  letter-spacing: 0.01em;
  opacity: 0.6;
}
`;

// Without these a touch pans and a drag text-selects, instead of moving anything.
const EDITABLE_SHEET = `
.sticky { touch-action: none; user-select: none; cursor: move; }
.sticky.dragging { cursor: grabbing; }
.handle {
  position: absolute;
  width: ${HANDLE_SIZE}px;
  height: ${HANDLE_SIZE}px;
  box-sizing: border-box;
  border: 1.5px solid #4b5563;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 90ms ease-out;
  /* Invisible handles would otherwise steal the drag that should move it. */
  pointer-events: none;
  touch-action: none;
}
.sticky:hover .handle, .sticky.selected .handle, .sticky.dragging .handle {
  opacity: 1;
  pointer-events: auto;
}
.handle:hover { border-color: #17171a; transform: scale(1.15); }
.handle[data-edge="nw"] { top: ${HANDLE_INSET}px; left: ${HANDLE_INSET}px; cursor: nwse-resize; }
.handle[data-edge="n"] { top: ${HANDLE_INSET}px; left: 50%; margin-left: ${HANDLE_INSET}px; cursor: ns-resize; }
.handle[data-edge="ne"] { top: ${HANDLE_INSET}px; right: ${HANDLE_INSET}px; cursor: nesw-resize; }
.handle[data-edge="e"] { top: 50%; right: ${HANDLE_INSET}px; margin-top: ${HANDLE_INSET}px; cursor: ew-resize; }
.handle[data-edge="se"] { bottom: ${HANDLE_INSET}px; right: ${HANDLE_INSET}px; cursor: nwse-resize; }
.handle[data-edge="s"] { bottom: ${HANDLE_INSET}px; left: 50%; margin-left: ${HANDLE_INSET}px; cursor: ns-resize; }
.handle[data-edge="sw"] { bottom: ${HANDLE_INSET}px; left: ${HANDLE_INSET}px; cursor: nesw-resize; }
.handle[data-edge="w"] { top: 50%; left: ${HANDLE_INSET}px; margin-top: ${HANDLE_INSET}px; cursor: ew-resize; }
.handle.tip {
  margin: ${HANDLE_INSET}px 0 0 ${HANDLE_INSET}px;
  border-color: #2f6fed;
  background: #2f6fed;
  box-shadow: 0 0 0 2.5px rgba(255, 255, 255, 0.9);
  cursor: crosshair;
}
.node {
  position: absolute;
  width: ${NODE_SIZE}px;
  height: ${NODE_SIZE}px;
  box-sizing: border-box;
  margin: ${-(NODE_SIZE / 2)}px 0 0 ${-(NODE_SIZE / 2)}px;
  border: 1.5px solid #2f6fed;
  background: #ffffff;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 90ms ease-out;
  pointer-events: none;
}
.sticky:hover .node, .sticky.selected .node, .sticky.dragging .node {
  opacity: 1;
}
.sticky.selected .shape path, .sticky.editing .shape path {
  stroke: #2f6fed;
  stroke-width: 2;
}
.sticky.editing {
  user-select: text;
  cursor: text;
}
.sticky.editing .content { overflow: auto; }
.sticky.editing .handle, .sticky.editing .node {
  opacity: 0;
  pointer-events: none;
}
`;

export type OverlayLayer = {
  highlights: HTMLElement;
  stickies: HTMLElement;
  setEditable(editable: boolean): void;
  destroy(): void;
};

export function createOverlayLayer(): OverlayLayer | null {
  const parent = document.body;
  if (parent === null) {
    return null;
  }

  const host = document.createElement("div");
  host.setAttribute(OVERLAY_HOST_ATTRIBUTE, "");
  host.setAttribute("style", HOST_STYLE);

  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = SHEET;
  const editableStyle = document.createElement("style");

  const highlights = document.createElement("div");
  highlights.className = "surface";
  const stickies = document.createElement("div");
  stickies.className = "surface";

  shadow.append(style, editableStyle, highlights, stickies);
  parent.appendChild(host);

  return {
    highlights,
    stickies,
    setEditable: (editable) => {
      editableStyle.textContent = editable ? EDITABLE_SHEET : "";
    },
    destroy: () => host.remove(),
  };
}
