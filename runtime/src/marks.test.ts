import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  placeAtMessage,
  setToolMessage,
  type RuntimeToAppMessage,
} from "@coedithtml/protocol";
import { startMarks } from "./marks";

const APP_ORIGIN = "https://app.test";

let stop: () => void = () => {};
let posted: RuntimeToAppMessage[] = [];

function postFromApp(message: unknown): void {
  window.dispatchEvent(
    new MessageEvent("message", { origin: APP_ORIGIN, data: message }),
  );
}

function clickAt(x: number, y: number): MouseEvent {
  const event = new MouseEvent("click", {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  });
  document.querySelector("p")?.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  document.body.innerHTML = "<p>Revenue grew 18% this quarter.</p>";
  window.__coedit__ = {
    version: "test",
    config: { appOrigin: APP_ORIGIN, revision: "r1" },
  };
  posted = [];

  vi.spyOn(window, "parent", "get").mockReturnValue({
    postMessage: (message: RuntimeToAppMessage) => posted.push(message),
  } as unknown as Window);

  Object.defineProperty(document, "elementsFromPoint", {
    configurable: true,
    value: () => [document.querySelector("p")].filter((node) => node !== null),
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 200,
    height: 100,
    right: 200,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });

  stop = startMarks();
});

afterEach(() => {
  stop();
  vi.restoreAllMocks();
  delete window.__coedit__;
});

describe("the sticky tool", () => {
  it("lets the artifact have its clicks while no tool is armed", () => {
    const event = clickAt(50, 25);

    expect(event.defaultPrevented).toBe(false);
    expect(posted.some((message) => message.type === "placement")).toBe(false);
  });

  it("reports where the reader clicked once a tool is armed", () => {
    postFromApp(setToolMessage("sticky"));
    clickAt(50, 25);

    expect(posted.at(-1)).toMatchObject({
      type: "placement",
      anchor: { kind: "region", fractionX: 0.25, fractionY: 0.25 },
    });
  });

  it("keeps the placing click away from the artifact", () => {
    postFromApp(setToolMessage("sticky"));
    const event = clickAt(50, 25);

    expect(event.defaultPrevented).toBe(true);
  });

  it("places once per arming", () => {
    postFromApp(setToolMessage("sticky"));
    clickAt(50, 25);
    clickAt(60, 30);

    const placements = posted.filter((message) => message.type === "placement");
    expect(placements).toHaveLength(1);
  });

  it("gives the artifact's own cursor back when disarmed", () => {
    document.body.style.cursor = "grab";

    postFromApp(setToolMessage("sticky"));
    expect(document.body.style.cursor).toBe("crosshair");

    postFromApp(setToolMessage(null));
    expect(document.body.style.cursor).toBe("grab");
  });

  it("resolves a point the app hands it without any arming", () => {
    postFromApp(placeAtMessage(50, 25));

    expect(posted.at(-1)).toMatchObject({
      type: "placement",
      anchor: { kind: "region", fractionX: 0.25, fractionY: 0.25 },
    });
  });

  it("says nothing when the drop lands on no element at all", () => {
    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: () => [],
    });

    postFromApp(placeAtMessage(5000, 5000));

    expect(posted.some((message) => message.type === "placement")).toBe(false);
  });

  it("ignores a tool armed by anyone but the app", () => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://evil.example",
        data: setToolMessage("sticky"),
      }),
    );
    const event = clickAt(50, 25);

    expect(event.defaultPrevented).toBe(false);
  });
});
