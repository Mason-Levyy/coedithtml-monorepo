export type ViewportPoint = { x: number; y: number };

const MAX_FRAME_HEIGHT = 10000;

export function framePixelHeight(contentHeight: number): string {
  const floor = Math.max(window.innerHeight, 1);
  const clamped = Math.min(
    Math.max(contentHeight, floor),
    Math.max(MAX_FRAME_HEIGHT, floor),
  );
  return `${clamped}px`;
}

export function pointOnPage(
  frame: HTMLIFrameElement | null,
  point: ViewportPoint,
): ViewportPoint | null {
  if (frame === null) {
    return null;
  }
  const box = frame.getBoundingClientRect();
  return { x: point.x + box.left, y: point.y + box.top };
}

export function pointInFrame(
  frame: HTMLIFrameElement | null,
  point: ViewportPoint,
): ViewportPoint | null {
  if (frame === null) {
    return null;
  }
  const box = frame.getBoundingClientRect();
  const inside =
    point.x >= box.left &&
    point.x <= box.right &&
    point.y >= box.top &&
    point.y <= box.bottom;
  return inside ? { x: point.x - box.left, y: point.y - box.top } : null;
}
