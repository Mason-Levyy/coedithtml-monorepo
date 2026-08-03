import { afterEach, describe, expect, it, vi } from "vitest";
import { sendToApp } from "./bridge";
import { readyMessage } from "./messages";

afterEach(() => {
  delete window.__coedit_config__;
});

describe("sendToApp", () => {
  it("posts the message to the resolved app origin", () => {
    window.__coedit_config__ = { appOrigin: "https://app.example.com" };
    const postMessage = vi.fn();
    vi.stubGlobal("parent", { postMessage });

    const message = readyMessage([], "app", false);
    sendToApp(message);

    expect(postMessage).toHaveBeenCalledWith(
      message,
      "https://app.example.com",
    );

    vi.unstubAllGlobals();
  });

  it("does not send when running at the top level (window.parent === window)", () => {
    window.__coedit_config__ = { appOrigin: "https://app.example.com" };
    const postMessage = vi.fn();
    vi.stubGlobal("parent", window);

    sendToApp(readyMessage([], "app", false));

    expect(postMessage).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("does not send when no app origin can be resolved", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("parent", { postMessage });
    Object.defineProperty(document, "referrer", {
      value: "",
      configurable: true,
    });

    sendToApp(readyMessage([], "app", false));

    expect(postMessage).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
