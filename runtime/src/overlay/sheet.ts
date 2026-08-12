const HANDLE_SIZE = 10;
const HANDLE_INSET = -(HANDLE_SIZE / 2 + 1);
const NODE_SIZE = 8;
const NODE_INSET = -(NODE_SIZE / 2);
const FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

export const SHEET =
  `
.surface { position: fixed; inset: 0; pointer-events: none; }
.highlight { position: fixed; border-radius: 2px; mix-blend-mode: multiply; pointer-events: auto; cursor: pointer; }
.sticky { position: fixed; box-sizing: border-box; display: flex; max-width: 220px; border-radius: 8px; font: 13px/1.45 ${FONT}; color: #17171a; pointer-events: auto; cursor: pointer; }
.sticky[style*="width"] { max-width: none; }
` +
  // The pointer is part of this path, so it leaves the box the content clips to.
  `.shape { position: absolute; inset: 0; overflow: visible; pointer-events: none; }
.shape path { stroke-width: 1; stroke-linejoin: round; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.12)); }
.content { position: relative; flex: 1 1 auto; min-width: 0; padding: 9px 11px; border-radius: inherit; white-space: pre-wrap; overflow-wrap: break-word; overflow: hidden; }
.body { display: block; }
.body:empty::before { content: "Type a note"; opacity: 0.45; }
.author { display: block; margin-top: 5px; font-size: 11px; letter-spacing: 0.01em; opacity: 0.6; }
.tools { display: none; }
`;

// Without these a touch pans and a drag text-selects, instead of moving anything.
export const EDITABLE_SHEET =
  `
.sticky { touch-action: none; user-select: none; cursor: move; }
.sticky.dragging { cursor: grabbing; }
` +
  // Invisible handles would otherwise steal the drag that should move it.
  `:is(.handle, .node) { position: absolute; box-sizing: border-box; background: #fff; border-radius: 50%; opacity: 0; transition: opacity 90ms ease-out; pointer-events: none; }
.handle { width: ${HANDLE_SIZE}px; height: ${HANDLE_SIZE}px; border: 1.5px solid #4b5563; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); touch-action: none; }
.node { width: ${NODE_SIZE}px; height: ${NODE_SIZE}px; margin: ${NODE_INSET}px 0 0 ${NODE_INSET}px; border: 1.5px solid #2f6fed; }
.sticky:is(:hover, .selected, .dragging) :is(.handle, .node) { opacity: 1; }
.sticky:is(:hover, .selected, .dragging) .handle { pointer-events: auto; }
.handle:hover { border-color: #17171a; transform: scale(1.15); }
.handle[data-edge="nw"] { top: ${HANDLE_INSET}px; left: ${HANDLE_INSET}px; cursor: nwse-resize; }
.handle[data-edge="n"] { top: ${HANDLE_INSET}px; left: 50%; margin-left: ${HANDLE_INSET}px; cursor: ns-resize; }
.handle[data-edge="ne"] { top: ${HANDLE_INSET}px; right: ${HANDLE_INSET}px; cursor: nesw-resize; }
.handle[data-edge="e"] { top: 50%; right: ${HANDLE_INSET}px; margin-top: ${HANDLE_INSET}px; cursor: ew-resize; }
.handle[data-edge="se"] { bottom: ${HANDLE_INSET}px; right: ${HANDLE_INSET}px; cursor: nwse-resize; }
.handle[data-edge="s"] { bottom: ${HANDLE_INSET}px; left: 50%; margin-left: ${HANDLE_INSET}px; cursor: ns-resize; }
.handle[data-edge="sw"] { bottom: ${HANDLE_INSET}px; left: ${HANDLE_INSET}px; cursor: nesw-resize; }
.handle[data-edge="w"] { top: 50%; left: ${HANDLE_INSET}px; margin-top: ${HANDLE_INSET}px; cursor: ew-resize; }
.handle.tip { margin: ${HANDLE_INSET}px 0 0 ${HANDLE_INSET}px; border-color: #2f6fed; background: #2f6fed; box-shadow: 0 0 0 2.5px rgba(255, 255, 255, 0.9); cursor: crosshair; }
.sticky:is(.selected, .editing) .shape path { stroke: #2f6fed; stroke-width: 2; }
.sticky.editing { user-select: text; cursor: text; }
.sticky.editing .content { overflow: auto; }
.sticky.editing :is(.handle, .node) { opacity: 0; pointer-events: none; }
` +
  // Padding, not a gap: a bare 6px would drop :hover and take the tools away mid-reach.
  `.tools { position: absolute; right: 0; bottom: 100%; padding-bottom: 6px; display: flex; gap: 4px; opacity: 0; transition: opacity 90ms ease-out; pointer-events: none; }
.sticky.low-room .tools { top: 100%; bottom: auto; padding: 6px 0 0; }
.sticky:is(:hover, .selected, .editing) .tools { opacity: 1; pointer-events: auto; }
.sticky.dragging .tools { opacity: 0; pointer-events: none; }
.tool { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; padding: 0; border: 1px solid #d3d5d8; border-radius: 6px; background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); color: #3c4046; font: 12px/1 ${FONT}; cursor: pointer; }
.tool:hover { border-color: #17171a; color: #17171a; }
.tool[data-tool="remove"]:hover { border-color: #d9455f; color: #d9455f; }
.sticky:not(.sized) .tool[data-tool="fit"] { display: none; }
`;
