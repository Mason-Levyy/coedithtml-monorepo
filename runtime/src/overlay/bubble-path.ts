import type { Point } from "./geometry";

export type Size = { width: number; height: number };

export type TailNodes = {
  edge: Edge;
  tip: Point;
  first: Point;
  second: Point;
};

const CORNER = 8;
const TAIL_HALF_BASE = 11;
const TAPER = 0.28;
const MIN_REACH = 8;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

function cornerOf(size: Size): number {
  return Math.min(CORNER, size.width / 2, size.height / 2);
}

export function centreOf(size: Size): Point {
  return { x: size.width / 2, y: size.height / 2 };
}

type Edge = "top" | "right" | "bottom" | "left";

type Exit = { edge: Edge; along: number; reach: number };

function exitThrough(size: Size, tip: Point): Exit | null {
  const towards = { x: tip.x - size.width / 2, y: tip.y - size.height / 2 };
  const span = Math.hypot(towards.x, towards.y);
  if (span === 0) {
    return null;
  }
  const toSide =
    towards.x === 0 ? Infinity : size.width / 2 / Math.abs(towards.x);
  const toCap =
    towards.y === 0 ? Infinity : size.height / 2 / Math.abs(towards.y);
  const scale = Math.min(toSide, toCap);
  const reach = span * (1 - scale);
  if (scale >= 1 || reach < MIN_REACH) {
    return null;
  }

  const root = {
    x: size.width / 2 + towards.x * scale,
    y: size.height / 2 + towards.y * scale,
  };
  if (toSide <= toCap) {
    return {
      edge: towards.x > 0 ? "right" : "left",
      along: root.y,
      reach,
    };
  }
  return { edge: towards.y > 0 ? "bottom" : "top", along: root.x, reach };
}

function baseSpread(size: Size, edge: Edge): { low: number; high: number } {
  const corner = cornerOf(size);
  const length = edge === "top" || edge === "bottom" ? size.width : size.height;
  return { low: corner, high: length - corner };
}

export function tailNodes(size: Size, tip: Point | null): TailNodes | null {
  if (tip === null) {
    return null;
  }
  const exit = exitThrough(size, tip);
  if (exit === null) {
    return null;
  }
  const { low, high } = baseSpread(size, exit.edge);
  const half = Math.min(TAIL_HALF_BASE, (high - low) / 2);
  if (half <= 0) {
    return null;
  }
  const centre = clamp(exit.along, low + half, high - half);
  const near = centre - half;
  const far = centre + half;

  const reversed = exit.edge === "bottom" || exit.edge === "left";
  const firstAlong = reversed ? far : near;
  const secondAlong = reversed ? near : far;
  const at = (along: number): Point => {
    if (exit.edge === "top") return { x: along, y: 0 };
    if (exit.edge === "bottom") return { x: along, y: size.height };
    if (exit.edge === "left") return { x: 0, y: along };
    return { x: size.width, y: along };
  };
  return {
    edge: exit.edge,
    tip,
    first: at(firstAlong),
    second: at(secondAlong),
  };
}

function lineTo(point: Point): string {
  return `L${round(point.x)},${round(point.y)}`;
}

function curveTo(control: Point, end: Point): string {
  return `Q${round(control.x)},${round(control.y)} ${round(end.x)},${round(end.y)}`;
}

function control(base: Point, tip: Point, middle: Point): Point {
  return {
    x: base.x + (tip.x - base.x) / 2 + (middle.x - base.x) * TAPER,
    y: base.y + (tip.y - base.y) / 2 + (middle.y - base.y) * TAPER,
  };
}

function spout(nodes: TailNodes): string {
  const middle = {
    x: (nodes.first.x + nodes.second.x) / 2,
    y: (nodes.first.y + nodes.second.y) / 2,
  };
  return [
    lineTo(nodes.first),
    curveTo(control(nodes.first, nodes.tip, middle), nodes.tip),
    curveTo(control(nodes.second, nodes.tip, middle), nodes.second),
  ].join("");
}

function detour(nodes: TailNodes | null, on: Edge): string {
  return nodes === null || nodes.edge !== on ? "" : spout(nodes);
}

export function bubblePath(size: Size, tip: Point | null): string {
  const { width, height } = size;
  const r = cornerOf(size);
  const nodes = tailNodes(size, tip);
  const arc = (x: number, y: number): string =>
    `A${round(r)},${round(r)} 0 0 1 ${round(x)},${round(y)}`;

  return [
    `M${round(r)},0`,
    detour(nodes, "top"),
    `L${round(width - r)},0`,
    arc(width, r),
    detour(nodes, "right"),
    `L${round(width)},${round(height - r)}`,
    arc(width - r, height),
    detour(nodes, "bottom"),
    `L${round(r)},${round(height)}`,
    arc(0, height - r),
    detour(nodes, "left"),
    `L0,${round(r)}`,
    arc(r, 0),
    "Z",
  ].join("");
}
