const HANDLE_SIZE = 10;
const HANDLE_INSET = -(HANDLE_SIZE / 2 + 1);
const NODE_SIZE = 8;
const NODE_INSET = -(NODE_SIZE / 2);
const FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

export const SHEET =
  `
.surface { position: fixed; inset: 0; pointer-events: none; }
.highlight { position: fixed; border-radius: 2px; opacity: 0.25; mix-blend-mode: multiply; pointer-events: none; }
.sticky { position: fixed; box-sizing: border-box; display: flex; min-width: 120px; min-height: 40px; max-width: 220px; border-radius: 8px; font: 13px/1.45 ${FONT}; color: #17171a; pointer-events: auto; cursor: pointer; scrollbar-width: none; -ms-overflow-style: none; }
.sticky::-webkit-scrollbar { display: none; width: 0; height: 0; }
.sticky[style*="width"] { max-width: none; }
` +
  `.shape { position: absolute; inset: 0; overflow: visible; pointer-events: none; }
.shape path { stroke-width: 1; stroke-linejoin: round; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.12)); }
.content { position: relative; flex: 1 1 auto; min-width: 0; padding: 9px 28px 9px 11px; border-radius: inherit; white-space: pre-wrap; overflow-wrap: break-word; overflow: hidden; outline: none; scrollbar-width: none; -ms-overflow-style: none; }
.content::-webkit-scrollbar { display: none; width: 0; height: 0; }
.sticky.sized .content { padding-right: 48px; }
.body { display: block; outline: none; border: none; box-shadow: none; scrollbar-width: none; }
.body::-webkit-scrollbar { display: none; width: 0; height: 0; }
.body:focus, .body[contenteditable] { outline: none; border: none; box-shadow: none; }
.body:empty::before { content: "Type a note"; opacity: 0.45; }
.author { display: block; margin-top: 5px; font-size: 11px; letter-spacing: 0.01em; opacity: 0.6; }
.tools { display: none; }
`;

export const EDITABLE_SHEET =
  `
.sticky { touch-action: none; user-select: none; cursor: move; }
.sticky.dragging { cursor: grabbing; }
` +
  `:is(.handle, .node) { position: absolute; box-sizing: border-box; background: #fff; border-radius: 50%; opacity: 0; transition: opacity 90ms ease-out; pointer-events: none; }
.handle { width: ${HANDLE_SIZE}px; height: ${HANDLE_SIZE}px; border: 1.5px solid #4b5563; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); touch-action: none; }
.node { width: ${NODE_SIZE}px; height: ${NODE_SIZE}px; margin: ${NODE_INSET}px 0 0 ${NODE_INSET}px; border: 1.5px solid #2f6fed; }
.sticky:is(:hover, .selected, .editing, .dragging) :is(.handle, .node) { opacity: 1; }
.sticky:is(:hover, .selected, .editing, .dragging) .handle { pointer-events: auto; }
.handle:hover { border-color: #17171a; transform: scale(1.15); }
.handle[data-edge="nw"] { top: ${HANDLE_INSET}px; left: ${HANDLE_INSET}px; cursor: nwse-resize; }
.handle[data-edge="n"] { top: ${HANDLE_INSET}px; left: 50%; margin-left: ${HANDLE_INSET}px; cursor: ns-resize; }
.handle[data-edge="ne"] { top: ${HANDLE_INSET}px; right: ${HANDLE_INSET}px; cursor: nesw-resize; }
.handle[data-edge="e"] { top: 50%; right: ${HANDLE_INSET}px; margin-top: ${HANDLE_INSET}px; cursor: ew-resize; }
.handle[data-edge="se"] { bottom: ${HANDLE_INSET}px; right: ${HANDLE_INSET}px; cursor: nwse-resize; }
.handle[data-edge="s"] { bottom: ${HANDLE_INSET}px; left: 50%; margin-left: ${HANDLE_INSET}px; cursor: ns-resize; }
.handle[data-edge="sw"] { bottom: ${HANDLE_INSET}px; left: ${HANDLE_INSET}px; cursor: nesw-resize; }
.handle[data-edge="w"] { top: 50%; left: ${HANDLE_INSET}px; margin-top: ${HANDLE_INSET}px; cursor: ew-resize; }
.handle.tip { margin: ${HANDLE_INSET}px 0 0 ${HANDLE_INSET}px; box-shadow: 0 0 0 2.5px rgba(255, 255, 255, 0.9); cursor: crosshair; }
.sticky:is(.selected, .editing) .shape path { stroke: #2f6fed; stroke-width: 2; }
.sticky.editing { user-select: text; cursor: text; }
.sticky.editing .content { overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
.sticky.editing .content::-webkit-scrollbar { display: none; width: 0; height: 0; }
` +
  `.tools { position: absolute; right: 4px; top: 4px; z-index: 10; display: flex; gap: 4px; opacity: 0; transition: opacity 90ms ease-out; pointer-events: none; }
.sticky:is(:hover, .selected) .tools { opacity: 1; pointer-events: auto; }
.sticky.dragging .tools { opacity: 0; pointer-events: none; }
.tool { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; padding: 0; border: none; border-radius: 50%; background: transparent; color: inherit; font: 12px/1 ${FONT}; cursor: pointer; opacity: 0.6; transition: transform 100ms ease, opacity 100ms ease, background-color 100ms ease; flex-shrink: 0; }
.tool:hover { opacity: 1; transform: scale(1.15); background: rgba(0, 0, 0, 0.12); }
.tool:active { transform: scale(0.92); }
.tool[data-tool="remove"]:hover { color: inherit; }
.sticky:not(.sized) .tool[data-tool="fit"] { display: none; }
`;
