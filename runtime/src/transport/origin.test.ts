import { afterEach, describe, expect, it } from "vitest";
import { resolveAppOrigin } from "./origin";

function setReferrer(value: string): void {
  Object.defineProperty(document, "referrer", { value, configurable: true });
}

afterEach(() => {
  delete window.__coedit__;
  setReferrer("");
});

describe("resolveAppOrigin", () => {
  it("uses the configured app origin when present", () => {
    window.__coedit__ = {
      version: "test",
      config: { appOrigin: "https://app.example.com" },
    };

    expect(resolveAppOrigin()).toBe("https://app.example.com");
  });

  it("normalizes a configured origin with a trailing path", () => {
    window.__coedit__ = {
      version: "test",
      config: { appOrigin: "https://app.example.com/foo" },
    };

    expect(resolveAppOrigin()).toBe("https://app.example.com");
  });

  it("returns null when no config is set", () => {
    expect(resolveAppOrigin()).toBeNull();
  });

  it("returns null when the configured value is malformed", () => {
    window.__coedit__ = {
      version: "test",
      config: { appOrigin: "not a url" },
    };

    expect(resolveAppOrigin()).toBeNull();
  });

  it("returns null when the configured value is not a string", () => {
    window.__coedit__ = { version: "test", config: { appOrigin: 42 } };

    expect(resolveAppOrigin()).toBeNull();
  });

  // document.referrer names whoever framed the artifact. Trusting it would
  // make any page that can embed a link a trusted command origin, so a
  // missing config has to fail closed rather than guess.
  it("never falls back to the referrer", () => {
    setReferrer("https://evil.example/embed");

    expect(resolveAppOrigin()).toBeNull();
  });

  it("ignores the referrer even when a config is present", () => {
    window.__coedit__ = {
      version: "test",
      config: { appOrigin: "https://app.example.com" },
    };
    setReferrer("https://evil.example/embed");

    expect(resolveAppOrigin()).toBe("https://app.example.com");
  });
});
