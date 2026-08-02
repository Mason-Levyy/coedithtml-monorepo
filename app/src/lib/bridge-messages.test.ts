import { describe, expect, it } from "vitest";
import { parseRuntimeToAppMessage } from "./bridge-messages";

const VALID_SLIDE = { index: 0, startChild: 0, endChild: 1, label: "One" };

describe("parseRuntimeToAppMessage", () => {
  it("accepts a well-formed ready message", () => {
    const message = parseRuntimeToAppMessage({
      version: 1,
      type: "ready",
      slides: [VALID_SLIDE],
      profile: "slides",
    });

    expect(message).toEqual({
      version: 1,
      type: "ready",
      slides: [VALID_SLIDE],
      profile: "slides",
    });
  });

  it("accepts a well-formed resegmented message", () => {
    const message = parseRuntimeToAppMessage({
      version: 1,
      type: "resegmented",
      slides: [],
      profile: "app",
    });

    expect(message?.type).toBe("resegmented");
  });

  it("rejects a message with the wrong version", () => {
    expect(
      parseRuntimeToAppMessage({
        version: 2,
        type: "ready",
        slides: [],
        profile: "slides",
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
      }),
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
      }),
    ).toBeNull();
  });
});
