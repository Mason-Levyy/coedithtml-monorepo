import { describe, expect, it } from "vitest";
import {
  BRIDGE_VERSION,
  parseRuntimeToAppMessage,
  readyMessage,
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

  it("rejects values that are not objects", () => {
    expect(parseRuntimeToAppMessage(null)).toBeNull();
    expect(parseRuntimeToAppMessage("ready")).toBeNull();
  });
});
