import {
  effectiveEdge,
  effectiveFill,
  textOn,
  type StickyEntry,
} from "@coedithtml/protocol";
import { OVERLAY_HOST_ATTRIBUTE } from "../dom/constants";
import { locateAnchor, type Point } from "../overlay/geometry";
import { bubblePath } from "../overlay/sticky-geometry";
import type { TextIndex } from "../dom/text-index";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const NO_TEXT_INDEX: TextIndex = { text: "", segments: [] };

const SHEET =
  ".surface{position:absolute;top:0;left:0;pointer-events:none}" +
  ".sticky{position:absolute;box-sizing:border-box;display:flex;min-width:120px;min-height:40px;max-width:220px;border-radius:8px;font:13px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#17171a}" +
  '.sticky[data-size="s"]{font-size:11px}.sticky[data-size="l"]{font-size:16px}.sticky[data-size="xl"]{font-size:20px}' +
  ".shape{position:absolute;inset:0;overflow:visible}" +
  ".shape path{stroke-width:1;stroke-linejoin:round;filter:drop-shadow(0 1px 2px rgba(0,0,0,.12))}" +
  ".content{position:relative;flex:1 1 auto;min-width:0;padding:9px 11px;white-space:pre-wrap;overflow-wrap:break-word}" +
  ".author{display:block;margin-top:5px;font-size:.85em;letter-spacing:.01em;opacity:.6}";

function createHost(): HTMLElement | null {
  const parent = document.documentElement;
  if (parent === null) {
    return null;
  }
  const host = document.createElement("div");
  host.setAttribute(OVERLAY_HOST_ATTRIBUTE, "");
  host.setAttribute(
    "style",
    "position:absolute;top:0;left:0;width:0;height:0;margin:0;padding:0;border:0;z-index:2147483000;pointer-events:none",
  );
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = SHEET;
  const surface = document.createElement("div");
  surface.className = "surface";
  shadow.append(style, surface);
  parent.appendChild(host);
  return surface;
}

function createStickyElement(mark: StickyEntry): HTMLElement {
  const element = document.createElement("div");
  element.className = "sticky";

  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("class", "shape");
  svg.appendChild(document.createElementNS(SVG_NAMESPACE, "path"));
  element.appendChild(svg);

  const content = document.createElement("div");
  content.className = "content";
  const body = document.createElement("span");
  body.textContent = mark.body;
  const author = document.createElement("span");
  author.className = "author";
  author.textContent = mark.author.displayName;
  content.append(body, author);
  element.appendChild(content);

  return element;
}

function paintStickyElement(
  element: HTMLElement,
  mark: StickyEntry,
  at: Point,
): void {
  element.style.left = `${at.x + window.scrollX + mark.offsetX}px`;
  element.style.top = `${at.y + window.scrollY + mark.offsetY}px`;
  element.style.width =
    mark.width === null ? "" : `${Math.round(mark.width)}px`;
  element.style.minHeight =
    mark.height === null ? "" : `${Math.round(mark.height)}px`;
  element.style.color = textOn(effectiveFill(mark));
  element.dataset.size = mark.textSize;

  const box = element.getBoundingClientRect();
  const path = element.querySelector("path");
  if (path === null) {
    return;
  }
  path.setAttribute("d", bubblePath(box, mark.tail));
  path.setAttribute("fill", effectiveFill(mark));
  path.setAttribute("stroke", effectiveEdge(mark));
}

export function paintStickies(stickies: StickyEntry[]): HTMLElement | null {
  if (stickies.length === 0) {
    return null;
  }
  const surface = createHost();
  if (surface === null) {
    return null;
  }

  const elements = new Map<string, HTMLElement>();

  function repaint(onto: HTMLElement): void {
    for (const mark of stickies) {
      const located = locateAnchor(NO_TEXT_INDEX, mark.anchor);
      if (located.at === null) {
        continue;
      }
      let element = elements.get(mark.id);
      if (element === undefined) {
        element = onto.appendChild(createStickyElement(mark));
        elements.set(mark.id, element);
      }
      paintStickyElement(element, mark, located.at);
    }
  }

  const onFrame = (): void => repaint(surface);
  onFrame();
  window.addEventListener("resize", onFrame);
  return surface;
}
