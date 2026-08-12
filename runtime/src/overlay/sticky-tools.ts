import type { OverlayLayer } from "./layer";
import type { StickyView } from "./sticky-view";

const STICKY_TOOLS = ["remove", "fit"] as const;

type StickyTool = (typeof STICKY_TOOLS)[number];

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

export function startStickyTools(options: {
  layer: OverlayLayer;
  view: StickyView;
  canWrite(): boolean;
  onRemove(markId: string): void;
  onFit(markId: string): void;
}): { stop(): void } {
  const surface = options.layer.stickies;

  function onClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !options.canWrite()) {
      return;
    }
    const tool = toolOf(target);
    const markId = options.view.markIdOf(target);
    if (tool === null || markId === null) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    if (tool === "remove") {
      options.onRemove(markId);
      return;
    }
    options.onFit(markId);
  }

  surface.addEventListener("click", onClick, true);
  return { stop: () => surface.removeEventListener("click", onClick, true) };
}
