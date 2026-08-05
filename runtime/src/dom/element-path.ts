const STEP = /^([a-z0-9-]+)\[(\d+)\]$/;

function positionAmongTwins(element: Element): number {
  let position = 1;
  for (
    let sibling = element.previousElementSibling;
    sibling !== null;
    sibling = sibling.previousElementSibling
  ) {
    if (sibling.tagName === element.tagName) {
      position += 1;
    }
  }
  return position;
}

export function pathToElement(element: Element): string {
  const steps: string[] = [];
  for (
    let node: Element | null = element;
    node !== null && node !== document.body;
    node = node.parentElement
  ) {
    steps.unshift(`${node.tagName.toLowerCase()}[${positionAmongTwins(node)}]`);
  }
  return steps.join("/");
}

function childAt(
  parent: Element,
  tag: string,
  position: number,
): Element | null {
  let seen = 0;
  for (const child of Array.from(parent.children)) {
    if (child.tagName.toLowerCase() !== tag) {
      continue;
    }
    seen += 1;
    if (seen === position) {
      return child;
    }
  }
  return null;
}

export function elementForPath(path: string): Element | null {
  let current: Element | null = document.body;
  if (current === null || path.length === 0) {
    return current;
  }
  for (const step of path.split("/")) {
    const parsed = STEP.exec(step);
    if (parsed === null || current === null) {
      return null;
    }
    current = childAt(current, parsed[1] ?? "", Number(parsed[2]));
  }
  return current;
}

export function sharedPathDepth(a: string, b: string): number {
  const left = a.split("/");
  const right = b.split("/");
  const limit = Math.min(left.length, right.length);
  let shared = 0;
  while (shared < limit && left[shared] === right[shared]) {
    shared += 1;
  }
  return shared;
}
