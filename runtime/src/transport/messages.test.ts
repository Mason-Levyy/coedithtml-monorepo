import { describe, expect, it } from "vitest";
import { readyMessage, resegmentedMessage } from "./messages";

const SLIDES = [{ index: 0, startChild: 0, endChild: 1, label: "One" }];

describe("readyMessage", () => {
  it("builds a versioned ready message", () => {
    expect(readyMessage(SLIDES, "slides")).toEqual({
      version: 1,
      type: "ready",
      slides: SLIDES,
      profile: "slides",
    });
  });
});

describe("resegmentedMessage", () => {
  it("builds a versioned resegmented message", () => {
    expect(resegmentedMessage(SLIDES, "pages")).toEqual({
      version: 1,
      type: "resegmented",
      slides: SLIDES,
      profile: "pages",
    });
  });
});
