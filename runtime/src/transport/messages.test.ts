import { describe, expect, it } from "vitest";
import {
  activeSlideMessage,
  parseAppToRuntimeMessage,
  readyMessage,
  resegmentedMessage,
} from "./messages";

const SLIDES = [{ index: 0, startChild: 0, endChild: 1, label: "One" }];

describe("readyMessage", () => {
  it("builds a versioned ready message", () => {
    expect(readyMessage(SLIDES, "slides", true)).toEqual({
      version: 1,
      type: "ready",
      slides: SLIDES,
      profile: "slides",
      hasStickyOrFixed: true,
    });
  });
});

describe("resegmentedMessage", () => {
  it("builds a versioned resegmented message", () => {
    expect(resegmentedMessage(SLIDES, "pages", false)).toEqual({
      version: 1,
      type: "resegmented",
      slides: SLIDES,
      profile: "pages",
      hasStickyOrFixed: false,
    });
  });
});

describe("activeSlideMessage", () => {
  it("builds a versioned active-slide message", () => {
    expect(activeSlideMessage(2)).toEqual({
      version: 1,
      type: "activeSlide",
      index: 2,
    });
  });
});

describe("parseAppToRuntimeMessage", () => {
  it("accepts a scrollToSlide command", () => {
    expect(
      parseAppToRuntimeMessage({
        version: 1,
        type: "scrollToSlide",
        index: 3,
      }),
    ).toEqual({ version: 1, type: "scrollToSlide", index: 3 });
  });

  it("accepts a setStageSlide command with a numeric index", () => {
    expect(
      parseAppToRuntimeMessage({ version: 1, type: "setStageSlide", index: 1 }),
    ).toEqual({ version: 1, type: "setStageSlide", index: 1 });
  });

  it("accepts a setStageSlide command with a null index (exit stage mode)", () => {
    expect(
      parseAppToRuntimeMessage({
        version: 1,
        type: "setStageSlide",
        index: null,
      }),
    ).toEqual({ version: 1, type: "setStageSlide", index: null });
  });

  it("rejects the wrong version", () => {
    expect(
      parseAppToRuntimeMessage({
        version: 2,
        type: "scrollToSlide",
        index: 0,
      }),
    ).toBeNull();
  });

  it("rejects an unknown command type", () => {
    expect(
      parseAppToRuntimeMessage({ version: 1, type: "explode", index: 0 }),
    ).toBeNull();
  });

  it("rejects a scrollToSlide command with a non-numeric index", () => {
    expect(
      parseAppToRuntimeMessage({
        version: 1,
        type: "scrollToSlide",
        index: "3",
      }),
    ).toBeNull();
  });

  it("rejects a setStageSlide command with a non-numeric, non-null index", () => {
    expect(
      parseAppToRuntimeMessage({
        version: 1,
        type: "setStageSlide",
        index: "oops",
      }),
    ).toBeNull();
  });

  it("rejects non-object values", () => {
    expect(parseAppToRuntimeMessage("hello")).toBeNull();
    expect(parseAppToRuntimeMessage(null)).toBeNull();
  });
});
