import { OVERLAY_HOST_ATTRIBUTE } from "../dom/constants";
import { EDITABLE_SHEET, SHEET } from "./sheet";

const HOST_STYLE =
  "position:fixed;top:0;left:0;width:0;height:0;margin:0;padding:0;border:0;" +
  "z-index:2147483000;pointer-events:none";

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
