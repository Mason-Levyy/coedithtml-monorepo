import { describe, expect, it } from "vitest";
import {
  BRIDGE_VERSION,
  fitMessage,
  parseAppToRuntimeMessage,
  parseRuntimeToAppMessage,
  placedMessage,
  readyMessage,
  revealMarkMessage,
  shortcutMessage,
} from "./index";

describe("parseRuntimeToAppMessage", () => {
  it("round-trips a ready message", () => {
    const message = readyMessage("Q3 Review");

    expect(parseRuntimeToAppMessage(message)).toEqual(message);
  });

  it("rejects a message from another protocol version", () => {
    expect(
      parseRuntimeToAppMessage({ ...readyMessage("Q3"), version: 2 }),
    ).toBeNull();
  });

  it("rejects an unknown message type", () => {
    expect(
      parseRuntimeToAppMessage({
        version: BRIDGE_VERSION,
        type: "selfDestruct",
      }),
    ).toBeNull();
  });

  it("rejects a ready message with no usable title", () => {
    expect(
      parseRuntimeToAppMessage({ version: BRIDGE_VERSION, type: "ready" }),
    ).toBeNull();
    expect(
      parseRuntimeToAppMessage({
        version: BRIDGE_VERSION,
        type: "ready",
        title: 42,
      }),
    ).toBeNull();
  });

  it("round-trips a shortcut the artifact's own document caught", () => {
    const message = shortcutMessage("toggle-sticky");

    expect(parseRuntimeToAppMessage(message)).toEqual(message);
  });

  it("rejects a shortcut naming an action the app does not answer to", () => {
    expect(
      parseRuntimeToAppMessage({
        version: BRIDGE_VERSION,
        type: "shortcut",
        action: "format-hard-drive",
      }),
    ).toBeNull();
  });

  it("rejects values that are not objects", () => {
    expect(parseRuntimeToAppMessage(null)).toBeNull();
    expect(parseRuntimeToAppMessage("ready")).toBeNull();
  });

  it("round-trips both fit modes", () => {
    const scrolls = fitMessage("scrolls-itself", 800);
    const grows = fitMessage("grows-to-content", 4200);

    expect(parseRuntimeToAppMessage(scrolls)).toEqual(scrolls);
    expect(parseRuntimeToAppMessage(grows)).toEqual(grows);
  });

  it("rejects a fit message with an unknown mode", () => {
    expect(
      parseRuntimeToAppMessage({
        version: BRIDGE_VERSION,
        type: "fit",
        mode: "whatever",
        contentHeight: 100,
      }),
    ).toBeNull();
  });

  it("rejects a fit height that is not a usable number", () => {
    for (const contentHeight of ["800", Number.NaN, Infinity, -1]) {
      expect(
        parseRuntimeToAppMessage({
          version: BRIDGE_VERSION,
          type: "fit",
          mode: "grows-to-content",
          contentHeight,
        }),
      ).toBeNull();
    }
  });

  it("round-trips a placement report", () => {
    const placed = placedMessage({
      offscreen: ["c1"],
      hidden: ["c2"],
      orphaned: ["c3"],
    });

    expect(parseRuntimeToAppMessage(placed)).toEqual(placed);
  });

  it("rejects a placement report with a missing or unusable list", () => {
    const lists = [
      { offscreen: ["c1"], hidden: ["c2"] },
      { offscreen: ["c1"], hidden: ["c2"], orphaned: [7] },
      { offscreen: "c1", hidden: [], orphaned: [] },
    ];

    for (const list of lists) {
      expect(
        parseRuntimeToAppMessage({
          version: BRIDGE_VERSION,
          type: "placed",
          ...list,
        }),
      ).toBeNull();
    }
  });
});

describe("parseAppToRuntimeMessage", () => {
  it("round-trips a reveal request", () => {
    const reveal = revealMarkMessage("c1");

    expect(parseAppToRuntimeMessage(reveal)).toEqual(reveal);
  });

  it("rejects a reveal request naming no mark", () => {
    expect(
      parseAppToRuntimeMessage({
        version: BRIDGE_VERSION,
        type: "reveal-mark",
        markId: "",
      }),
    ).toBeNull();
  });
});
