import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Anchor } from "@coedithtml/protocol";
import { buildTextIndex, type TextIndex } from "../dom/text-index";
import { revealAnchor } from "./reveal";

const TEXT_ANCHOR: Anchor = {
  kind: "text",
  quote: "Revenue grew 18%",
  prefix: "",
  suffix: " this quarter.",
  path: "p[1]",
  revision: "r1",
};

const REGION_ANCHOR: Anchor = {
  kind: "region",
  path: "figure[1]",
  fractionX: 0.5,
  fractionY: 0.5,
  revision: "r1",
};

describe("revealing an anchor", () => {
  let index: TextIndex;
  let scrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.body.innerHTML =
      "<p>Revenue grew 18% this quarter.</p><figure>Chart</figure>";
    scrollIntoView = vi.fn();
    vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(
      scrollIntoView,
    );
    index = buildTextIndex(document.body);
  });

  it("scrolls the element holding the quoted text", () => {
    revealAnchor(index, TEXT_ANCHOR);

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      behavior: "smooth",
    });
    expect(scrollIntoView.mock.instances[0]).toBe(document.querySelector("p"));
  });

  it("scrolls the element a region anchor names", () => {
    revealAnchor(index, REGION_ANCHOR);

    expect(scrollIntoView.mock.instances[0]).toBe(
      document.querySelector("figure"),
    );
  });

  it("does nothing for an anchor that resolves to nothing", () => {
    document.body.innerHTML = "<p>Everything here was rewritten.</p>";

    revealAnchor(buildTextIndex(document.body), TEXT_ANCHOR);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
