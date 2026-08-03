import { describe, expect, it } from "vitest";
import {
  parseRuntimeToAppMessage,
  scrollToSlideCommand,
  setStageSlideCommand,
} from "./bridge-messages";

const VALID_SLIDE = { index: 0, startChild: 0, endChild: 1, label: "One" };

describe("parseRuntimeToAppMessage", () => {
  it("accepts a well-formed ready message", () => {
    const message = parseRuntimeToAppMessage({
      version: 1,
      type: "ready",
      slides: [VALID_SLIDE],
      profile: "slides",
      hasStickyOrFixed: false,
    });

    expect(message).toEqual({
      version: 1,
      type: "ready",
      slides: [VALID_SLIDE],
      profile: "slides",
      hasStickyOrFixed: false,
    });
  });

  it("accepts a well-formed resegmented message", () => {
    const message = parseRuntimeToAppMessage({
      version: 1,
      type: "resegmented",
      slides: [],
      profile: "app",
      hasStickyOrFixed: true,
      activeSlideIndex: 2,
    });

    expect(message).toEqual({
      version: 1,
      type: "resegmented",
      slides: [],
      profile: "app",
      hasStickyOrFixed: true,
      activeSlideIndex: 2,
    });
  });

  it("rejects a resegmented message missing activeSlideIndex", () => {
    expect(
      parseRuntimeToAppMessage({
        version: 1,
        type: "resegmented",
        slides: [],
        profile: "app",
        hasStickyOrFixed: true,
      }),
    ).toBeNull();
  });

  it("accepts a well-formed activeSlide message", () => {
    const message = parseRuntimeToAppMessage({
      version: 1,
      type: "activeSlide",
      index: 3,
    });

    expect(message).toEqual({ version: 1, type: "activeSlide", index: 3 });
  });

  it("rejects a message with the wrong version", () => {
    expect(
      parseRuntimeToAppMessage({
        version: 2,
        type: "ready",
        slides: [],
        profile: "slides",
        hasStickyOrFixed: false,
      }),
    ).toBeNull();
  });

  it("rejects a message with an unknown type", () => {
    expect(
      parseRuntimeToAppMessage({
        version: 1,
        type: "hello",
        slides: [],
        profile: "slides",
        hasStickyOrFixed: false,
      }),
    ).toBeNull();
  });

  it("rejects a ready message missing hasStickyOrFixed", () => {
    expect(
      parseRuntimeToAppMessage({
        version: 1,
        type: "ready",
        slides: [],
        profile: "slides",
      }),
    ).toBeNull();
  });

  it("rejects a message with a malformed slide", () => {
    expect(
      parseRuntimeToAppMessage({
        version: 1,
        type: "ready",
        slides: [{ index: 0 }],
        profile: "slides",
        hasStickyOrFixed: false,
      }),
    ).toBeNull();
  });

  it("rejects a message with an invalid reading profile", () => {
    expect(
      parseRuntimeToAppMessage({
        version: 1,
        type: "ready",
        slides: [],
        profile: "presentation",
        hasStickyOrFixed: false,
      }),
    ).toBeNull();
  });

  it("rejects an activeSlide message with a non-numeric index", () => {
    expect(
      parseRuntimeToAppMessage({ version: 1, type: "activeSlide", index: "3" }),
    ).toBeNull();
  });

  it("rejects non-object values", () => {
    expect(parseRuntimeToAppMessage("hello")).toBeNull();
    expect(parseRuntimeToAppMessage(null)).toBeNull();
    expect(parseRuntimeToAppMessage(undefined)).toBeNull();
    expect(parseRuntimeToAppMessage(42)).toBeNull();
  });

  it("rejects an object with slides that is not an array", () => {
    expect(
      parseRuntimeToAppMessage({
        version: 1,
        type: "ready",
        slides: "not-an-array",
        profile: "slides",
        hasStickyOrFixed: false,
      }),
    ).toBeNull();
  });
});

describe("scrollToSlideCommand", () => {
  it("builds a versioned scroll command", () => {
    expect(scrollToSlideCommand(4)).toEqual({
      version: 1,
      type: "scrollToSlide",
      index: 4,
    });
  });
});

describe("setStageSlideCommand", () => {
  it("builds a versioned stage command with a slide index", () => {
    expect(setStageSlideCommand(1)).toEqual({
      version: 1,
      type: "setStageSlide",
      index: 1,
    });
  });

  it("builds a versioned stage command exiting stage mode", () => {
    expect(setStageSlideCommand(null)).toEqual({
      version: 1,
      type: "setStageSlide",
      index: null,
    });
  });
});
