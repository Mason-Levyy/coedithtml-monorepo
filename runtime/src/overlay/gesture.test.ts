import { beforeEach, describe, expect, it, vi } from "vitest";
import { beginGesture, type GestureUpdate } from "./gesture";

type Recorded = {
  updates: GestureUpdate[];
  commits: GestureUpdate[];
  cancels: number;
};

let element: HTMLElement;
let released: number[];

function down(overrides: Partial<PointerEventInit> = {}): PointerEvent {
  return new PointerEvent("pointerdown", {
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: 100,
    clientY: 100,
    ...overrides,
  });
}

function move(x: number, y: number, shiftKey = false): void {
  element.dispatchEvent(
    new PointerEvent("pointermove", {
      pointerId: 1,
      clientX: x,
      clientY: y,
      shiftKey,
    }),
  );
}

function up(x: number, y: number): void {
  element.dispatchEvent(
    new PointerEvent("pointerup", { pointerId: 1, clientX: x, clientY: y }),
  );
}

function record(): { handlers: Parameters<typeof beginGesture>[2] } & Recorded {
  const state: Recorded = { updates: [], commits: [], cancels: 0 };
  return {
    ...state,
    handlers: {
      onUpdate: (update) => state.updates.push(update),
      onCommit: (update) => state.commits.push(update),
      onCancel: () => (state.cancels += 1),
    },
    get updates() {
      return state.updates;
    },
    get commits() {
      return state.commits;
    },
    get cancels() {
      return state.cancels;
    },
  };
}

beforeEach(() => {
  document.body.innerHTML = "<div id='sticky'></div>";
  const found = document.getElementById("sticky");
  if (found === null) {
    throw new Error("no element");
  }
  element = found;
  released = [];
  element.setPointerCapture = vi.fn();
  element.releasePointerCapture = vi.fn((pointerId: number) => {
    released.push(pointerId);
  });
});

describe("beginGesture", () => {
  it("reports the distance travelled and commits once on release", () => {
    const spy = record();
    beginGesture(down(), element, spy.handlers);

    move(140, 130);
    up(140, 130);

    expect(spy.updates.at(-1)).toMatchObject({ dx: 40, dy: 30, moved: true });
    expect(spy.commits).toHaveLength(1);
    expect(spy.commits[0]).toMatchObject({ dx: 40, dy: 30 });
  });

  // A click and a drag arrive the same way; only the distance tells them apart.
  it("commits a press that never moved as a click", () => {
    const spy = record();
    beginGesture(down(), element, spy.handlers);

    up(101, 100);

    expect(spy.commits[0]?.moved).toBe(false);
  });

  it("carries Shift through so a resize can lock its ratio", () => {
    const spy = record();
    beginGesture(down(), element, spy.handlers);

    move(140, 130, true);

    expect(spy.updates.at(-1)?.shiftKey).toBe(true);
  });

  it("cancels on Escape and never commits", () => {
    const spy = record();
    beginGesture(down(), element, spy.handlers);

    move(140, 130);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    up(140, 130);

    expect(spy.cancels).toBe(1);
    expect(spy.commits).toEqual([]);
  });

  it("cancels when the browser takes the gesture away", () => {
    const spy = record();
    beginGesture(down(), element, spy.handlers);
    element.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 1 }));

    expect(spy.cancels).toBe(1);
  });

  // Reconcile can remove the element mid-drag, and pointerup never arrives.
  it("cancels when the element it was capturing is taken away", () => {
    const spy = record();
    beginGesture(down(), element, spy.handlers);
    element.dispatchEvent(
      new PointerEvent("lostpointercapture", { pointerId: 1 }),
    );

    expect(spy.cancels).toBe(1);
  });

  it("releases the pointer and answers only once however it ends", () => {
    const spy = record();
    const gesture = beginGesture(down(), element, spy.handlers);

    gesture?.end();
    gesture?.end();
    up(140, 130);

    expect(released).toEqual([1]);
    expect(spy.cancels).toBe(1);
    expect(spy.commits).toEqual([]);
  });

  it("stops listening once it is over", () => {
    const spy = record();
    beginGesture(down(), element, spy.handlers);
    up(140, 130);
    move(999, 999);

    expect(spy.updates).toEqual([]);
  });

  // A frozen overlay on top of somebody else's document is the failure to avoid.
  it("tears down even when a handler throws", () => {
    let cancelled = false;
    beginGesture(down(), element, {
      onUpdate: () => {
        throw new Error("boom");
      },
      onCommit: () => undefined,
      onCancel: () => (cancelled = true),
    });

    expect(() => move(140, 130)).not.toThrow();
    expect(cancelled).toBe(true);
    expect(released).toEqual([1]);
  });

  it("survives a release that the browser already did", () => {
    element.releasePointerCapture = vi.fn(() => {
      throw new DOMException("no capture", "NotFoundError");
    });
    const spy = record();
    beginGesture(down(), element, spy.handlers);

    expect(() => up(140, 130)).not.toThrow();
    expect(spy.commits).toHaveLength(1);
  });

  it("refuses a second finger or a right button", () => {
    const spy = record();

    expect(
      beginGesture(down({ isPrimary: false }), element, spy.handlers),
    ).toBeNull();
    expect(beginGesture(down({ button: 2 }), element, spy.handlers)).toBeNull();
  });

  it("ignores events from a different pointer", () => {
    const spy = record();
    beginGesture(down(), element, spy.handlers);
    element.dispatchEvent(
      new PointerEvent("pointermove", { pointerId: 9, clientX: 500 }),
    );

    expect(spy.updates).toEqual([]);
  });
});
