// A reading column, not a window width: single-file artifacts almost always
// constrain their body to a measure in this range, and a full-window width
// would under-count wrapped lines by roughly half.
const VIRTUAL_WIDTH = 720;
const AVERAGE_CHARACTER_WIDTH = 8;
const BODY_LINE_HEIGHT = 24;
const BLOCK_SPACING = 16;
const DEFAULT_MEDIA_HEIGHT = 320;

const HEADING_LINE_HEIGHTS: Record<string, number> = {
  H1: 48,
  H2: 40,
  H3: 32,
  H4: 28,
  H5: 24,
  H6: 24,
};

const BLOCK_SELECTOR =
  "address, article, aside, blockquote, div, dl, dd, dt, fieldset, figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, header, hr, li, main, nav, ol, p, pre, section, table, tr, ul";

const MEDIA_SELECTOR = "img, video, canvas, iframe, svg, object, embed";

function charactersPerLine(lineHeight: number): number {
  const characterWidth =
    (AVERAGE_CHARACTER_WIDTH * lineHeight) / BODY_LINE_HEIGHT;
  return Math.max(1, Math.floor(VIRTUAL_WIDTH / characterWidth));
}

function lineHeightOf(element: Element): number {
  return HEADING_LINE_HEIGHTS[element.tagName] ?? BODY_LINE_HEIGHT;
}

function ownTextLength(element: Element): number {
  return (element.textContent ?? "").trim().replace(/\s+/g, " ").length;
}

function textHeightOf(element: Element): number {
  const lineHeight = lineHeightOf(element);
  const lines = Math.ceil(
    ownTextLength(element) / charactersPerLine(lineHeight),
  );
  return Math.max(lines, 1) * lineHeight;
}

function declaredHeightOf(element: Element): number {
  const attribute = Number(element.getAttribute("height"));
  if (Number.isFinite(attribute) && attribute > 0) {
    return attribute;
  }
  return DEFAULT_MEDIA_HEIGHT;
}

function mediaHeightOf(element: Element): number {
  const media = element.matches(MEDIA_SELECTOR)
    ? [element]
    : [...element.querySelectorAll(MEDIA_SELECTOR)];
  return media.reduce((total, node) => total + declaredHeightOf(node), 0);
}

// Nested blocks would count their descendants' text twice, so only blocks that
// contain no further block descendant contribute a text height.
function leafBlocksOf(element: Element): Element[] {
  const blocks = [...element.querySelectorAll(BLOCK_SELECTOR)].filter(
    (block) => block.querySelector(BLOCK_SELECTOR) === null,
  );
  return blocks.length === 0 ? [element] : blocks;
}

// Estimated from the DOM at a fixed virtual width rather than measured with
// getBoundingClientRect: a real measurement reflows with the reader's viewport
// width, so the same link would break into a different number of slides on a
// phone than on a laptop and "slide 4" would mean two different things.
export function estimateVirtualHeight(element: Element): number {
  const textHeight = leafBlocksOf(element).reduce(
    (total, block) => total + textHeightOf(block) + BLOCK_SPACING,
    0,
  );
  return textHeight + mediaHeightOf(element);
}
