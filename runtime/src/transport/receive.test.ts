import { afterEach, describe, expect, it } from "vitest";
import { listenForAppCommands } from "./receive";

const APP_ORIGIN = "https://app.example.com";

afterEach(() => {
  delete window.__coedit_config__;
});

function dispatchMessage(origin: string, data: unknown): void {
  window.dispatchEvent(new MessageEvent("message", { origin, data }));
}

describe("listenForAppCommands", () => {
  it("invokes the callback for a valid command from the app origin", () => {
    window.__coedit_config__ = { appOrigin: APP_ORIGIN };
    const commands: unknown[] = [];
    const stop = listenForAppCommands((command) => commands.push(command));

    dispatchMessage(APP_ORIGIN, {
      version: 1,
      type: "scrollToSlide",
      index: 2,
    });

    expect(commands).toEqual([{ version: 1, type: "scrollToSlide", index: 2 }]);
    stop();
  });

  it("ignores a message from an origin other than the resolved app origin", () => {
    window.__coedit_config__ = { appOrigin: APP_ORIGIN };
    const commands: unknown[] = [];
    const stop = listenForAppCommands((command) => commands.push(command));

    dispatchMessage("https://evil.example.com", {
      version: 1,
      type: "scrollToSlide",
      index: 2,
    });

    expect(commands).toHaveLength(0);
    stop();
  });

  it("ignores every message when no app origin can be resolved", () => {
    Object.defineProperty(document, "referrer", {
      value: "",
      configurable: true,
    });
    const commands: unknown[] = [];
    const stop = listenForAppCommands((command) => commands.push(command));

    dispatchMessage(APP_ORIGIN, {
      version: 1,
      type: "scrollToSlide",
      index: 2,
    });

    expect(commands).toHaveLength(0);
    stop();
  });

  it("ignores a malformed message from the correct origin", () => {
    window.__coedit_config__ = { appOrigin: APP_ORIGIN };
    const commands: unknown[] = [];
    const stop = listenForAppCommands((command) => commands.push(command));

    dispatchMessage(APP_ORIGIN, { hello: "world" });

    expect(commands).toHaveLength(0);
    stop();
  });

  it("stops invoking the callback after the returned stop function is called", () => {
    window.__coedit_config__ = { appOrigin: APP_ORIGIN };
    const commands: unknown[] = [];
    const stop = listenForAppCommands((command) => commands.push(command));
    stop();

    dispatchMessage(APP_ORIGIN, {
      version: 1,
      type: "scrollToSlide",
      index: 2,
    });

    expect(commands).toHaveLength(0);
  });
});
