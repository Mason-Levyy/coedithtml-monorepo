import { BLOCK_TAGS, NON_TEXT_TAGS, OVERLAY_HOST_ATTRIBUTE } from "./constants";

type Segment = {
  node: Text;
  dataOffset: number;
  textOffset: number;
  length: number;
};

export type TextIndex = {
  text: string;
  segments: Segment[];
};

export type DomPoint = { node: Node; offset: number };

const WHITESPACE = /\s/;

function isHidden(element: Element): boolean {
  return (
    NON_TEXT_TAGS.has(element.tagName) ||
    element.hasAttribute(OVERLAY_HOST_ATTRIBUTE)
  );
}

function blockAncestorOf(node: Node): Element | null {
  for (
    let element = node.parentElement;
    element !== null;
    element = element.parentElement
  ) {
    if (BLOCK_TAGS.has(element.tagName)) {
      return element;
    }
  }
  return null;
}

export function buildTextIndex(root: Node): TextIndex {
  const segments: Segment[] = [];
  let text = "";
  let spacePending = false;
  let lastBlock: Element | null = null;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) =>
        node.nodeType === Node.ELEMENT_NODE && isHidden(node as Element)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    },
  );

  for (
    let found = walker.nextNode();
    found !== null;
    found = walker.nextNode()
  ) {
    if (found.nodeType === Node.ELEMENT_NODE) {
      if ((found as Element).tagName === "BR") {
        spacePending = text.length > 0;
      }
      continue;
    }

    const node = found as Text;
    const block = blockAncestorOf(node);
    if (block !== lastBlock) {
      spacePending = text.length > 0;
      lastBlock = block;
    }

    const data = node.data;
    let runStart = -1;

    const closeRun = (runEnd: number): void => {
      if (runStart === -1) {
        return;
      }
      segments.push({
        node,
        dataOffset: runStart,
        textOffset: text.length,
        length: runEnd - runStart,
      });
      text += data.slice(runStart, runEnd);
      runStart = -1;
    };

    for (let at = 0; at < data.length; at += 1) {
      if (WHITESPACE.test(data.charAt(at))) {
        closeRun(at);
        spacePending = text.length > 0;
        continue;
      }
      if (spacePending) {
        text += " ";
        spacePending = false;
      }
      if (runStart === -1) {
        runStart = at;
      }
    }
    closeRun(data.length);
  }

  return { text, segments };
}

function comparePoints(probe: Range, a: DomPoint, b: DomPoint): number {
  probe.setStart(a.node, a.offset);
  probe.collapse(true);
  const other = probe.cloneRange();
  other.setStart(b.node, b.offset);
  other.collapse(true);
  return probe.compareBoundaryPoints(Range.START_TO_START, other);
}

export function offsetForPoint(
  index: TextIndex,
  point: DomPoint,
  side: "start" | "end",
): number | null {
  const probe = document.createRange();
  let lastEnd: number | null = null;

  for (const segment of index.segments) {
    if (segment.node === point.node) {
      const within = point.offset - segment.dataOffset;
      if (within >= 0 && within <= segment.length) {
        return segment.textOffset + within;
      }
    }
    const segmentStart = { node: segment.node, offset: segment.dataOffset };
    if (comparePoints(probe, segmentStart, point) > 0) {
      return side === "start" ? segment.textOffset : lastEnd;
    }
    lastEnd = segment.textOffset + segment.length;
  }
  return side === "end" ? lastEnd : null;
}

export function offsetsForRange(
  index: TextIndex,
  range: Range,
): { start: number; end: number } | null {
  const start = offsetForPoint(
    index,
    { node: range.startContainer, offset: range.startOffset },
    "start",
  );
  const end = offsetForPoint(
    index,
    { node: range.endContainer, offset: range.endOffset },
    "end",
  );
  if (start === null || end === null || end <= start) {
    return null;
  }
  return { start, end };
}

function pointForOffset(
  index: TextIndex,
  offset: number,
  side: "start" | "end",
): DomPoint | null {
  let previous: DomPoint | null = null;
  for (const segment of index.segments) {
    const relative = offset - segment.textOffset;
    if (relative >= 0 && relative <= segment.length) {
      return { node: segment.node, offset: segment.dataOffset + relative };
    }
    if (relative < 0) {
      return side === "start"
        ? { node: segment.node, offset: segment.dataOffset }
        : previous;
    }
    previous = {
      node: segment.node,
      offset: segment.dataOffset + segment.length,
    };
  }
  return side === "end" ? previous : null;
}

export function rangeForOffsets(
  index: TextIndex,
  start: number,
  end: number,
): Range | null {
  if (start < 0 || end > index.text.length || end <= start) {
    return null;
  }
  const from = pointForOffset(index, start, "start");
  const to = pointForOffset(index, end, "end");
  if (from === null || to === null) {
    return null;
  }
  const range = document.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  return range;
}
