import { OVERLAY_HOST_ATTRIBUTE } from "../dom/constants";

const HOST_STYLE =
  "position:fixed;top:0;left:0;width:0;height:0;margin:0;padding:0;border:0;" +
  "z-index:2147483000;pointer-events:none";

const SHEET = `
.surface { position: fixed; inset: 0; pointer-events: none; }
.tails { position: fixed; inset: 0; overflow: visible; }
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
  max-width: 220px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid;
  font: 13px/1.4 system-ui, -apple-system, Segoe UI, sans-serif;
  color: #17171a;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
  pointer-events: auto;
  cursor: pointer;
}
.author { display: block; margin-top: 4px; font-size: 11px; opacity: 0.65; }
`;

export type OverlayLayer = {
  surface: HTMLElement;
  tails: SVGSVGElement;
  destroy(): void;
};

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

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

  const tails = document.createElementNS(SVG_NAMESPACE, "svg");
  tails.setAttribute("class", "tails");

  const surface = document.createElement("div");
  surface.className = "surface";

  shadow.append(style, tails, surface);
  parent.appendChild(host);

  return {
    surface,
    tails,
    destroy: () => host.remove(),
  };
}
