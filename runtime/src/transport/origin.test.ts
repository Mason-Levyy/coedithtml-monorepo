import { afterEach, describe, expect, it } from "vitest";
import { resolveAppOrigin } from "./origin";

afterEach(() => {
  delete window.__coedit_config__;
  Object.defineProperty(document, "referrer", {
    value: "",
    configurable: true,
  });
});

describe("resolveAppOrigin", () => {
  it("uses the configured app origin when present", () => {
    window.__coedit_config__ = { appOrigin: "https://app.example.com" };

    expect(resolveAppOrigin()).toBe("https://app.example.com");
  });

  it("normalizes a configured origin with a trailing path", () => {
    window.__coedit_config__ = { appOrigin: "https://app.example.com/foo" };

    expect(resolveAppOrigin()).toBe("https://app.example.com");
  });

  it("falls back to document.referrer when no config is set", () => {
    Object.defineProperty(document, "referrer", {
      value: "https://app.example.com/deck/abc123",
      configurable: true,
    });

    expect(resolveAppOrigin()).toBe("https://app.example.com");
  });

  it("falls back to document.referrer when the config value is malformed", () => {
    window.__coedit_config__ = { appOrigin: "not a url" };
    Object.defineProperty(document, "referrer", {
      value: "https://app.example.com/",
      configurable: true,
    });

    expect(resolveAppOrigin()).toBe("https://app.example.com");
  });

  it("returns null when neither config nor referrer is available", () => {
    expect(resolveAppOrigin()).toBeNull();
  });

  it("returns null when the referrer is present but unparseable", () => {
    Object.defineProperty(document, "referrer", {
      value: "not a url",
      configurable: true,
    });

    expect(resolveAppOrigin()).toBeNull();
  });
});
