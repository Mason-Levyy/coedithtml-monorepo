import type { Anchor } from "@coedithtml/protocol";
import { elementOf, rangeForTextAnchor } from "../dom/anchor-dom";
import { elementForPath } from "../dom/element-path";
import type { TextIndex } from "../dom/text-index";

function elementForAnchor(index: TextIndex, anchor: Anchor): Element | null {
  if (anchor.kind === "region") {
    return elementForPath(anchor.path);
  }
  const range = rangeForTextAnchor(index, anchor);
  return range === null ? null : elementOf(range.startContainer);
}

export function revealAnchor(index: TextIndex, anchor: Anchor): void {
  elementForAnchor(index, anchor)?.scrollIntoView({
    block: "center",
    behavior: "smooth",
  });
}
