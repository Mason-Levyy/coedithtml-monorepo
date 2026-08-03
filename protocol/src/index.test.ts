import { describe, expect, it } from "vitest";
import {
  BRIDGE_VERSION,
  parseAppToRuntimeMessage,
  parseRuntimeToAppMessage,
  readyMessage,
  resegmentedMessage,
  scrollToSlideCommand,
  setProfileCommand,
  setStageSlideCommand,
} from "./index";

const SLIDE = { index: 0, startChild: 0, endChild: 1, label: "One" };

describe("parseRuntimeToAppMessage", () => {
  it("round-trips a ready message", () => {
    const message = readyMessage([SLIDE], "slides", true);

    expect(parseRuntimeToAppMessage(message)).toEqual(message);
  });

  it("round-trips a resegmented message including the resolved index", () => {
    const message = resegmentedMessage([SLIDE], "pages", false, 3);

    expect(parseRuntimeToAppMessage(message)).toEqual(message);
  });

  it("rejects a message from another protocol version", () => {
    expect(
      parseRuntimeToAppMessage({
        ...readyMessage([], "app", false),
        version: 2,
      }),
    ).toBeNull();
  });

  it("rejects a slide list with a malformed entry", () => {
    expect(
      parseRuntimeToAppMessage({
        ...readyMessage([], "slides", false),
        slides: [{ index: 0, startChild: 0, endChild: 1 }],
      }),
    ).toBeNull();
  });

  it("rejects an unknown reading profile", () => {
    expect(
      parseRuntimeToAppMessage({
        ...readyMessage([], "slides", false),
        profile: "cinematic",
      }),
    ).toBeNull();
  });

  it("rejects values that are not objects", () => {
    expect(parseRuntimeToAppMessage(null)).toBeNull();
    expect(parseRuntimeToAppMessage("ready")).toBeNull();
  });
});

describe("parseAppToRuntimeMessage", () => {
  it("round-trips each command", () => {
    for (const command of [
      scrollToSlideCommand(2),
      setStageSlideCommand(1),
      setStageSlideCommand(null),
      setProfileCommand("pages"),
    ]) {
      expect(parseAppToRuntimeMessage(command)).toEqual(command);
    }
  });

  it("rejects a command from another protocol version", () => {
    expect(
      parseAppToRuntimeMessage({ ...scrollToSlideCommand(1), version: 99 }),
    ).toBeNull();
  });

  it("rejects a non-finite slide index", () => {
    expect(
      parseAppToRuntimeMessage({
        version: BRIDGE_VERSION,
        type: "scrollToSlide",
        index: Number.NaN,
      }),
    ).toBeNull();
  });

  it("rejects an unknown command type", () => {
    expect(
      parseAppToRuntimeMessage({
        version: BRIDGE_VERSION,
        type: "selfDestruct",
      }),
    ).toBeNull();
  });
});
