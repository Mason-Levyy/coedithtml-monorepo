import { describe, expect, it } from "vitest";
import { classifyRequestOrigin, type OriginConfig } from "./origins";
import { FAKE_APP_HOST, FAKE_SANDBOX_HOST } from "./fakes";

const config: OriginConfig = {
  APP_HOST: FAKE_APP_HOST,
  SANDBOX_HOST: FAKE_SANDBOX_HOST,
};

function classify(url: string) {
  return classifyRequestOrigin(new Request(url), config);
}

describe("classifyRequestOrigin", () => {
  it("routes the app host to the app origin", () => {
    expect(classify(`http://${FAKE_APP_HOST}/dashboard`)).toBe("app");
  });

  it("routes the sandbox host to the sandbox origin", () => {
    expect(classify(`http://${FAKE_SANDBOX_HOST}/a/abc123`)).toBe("sandbox");
  });

  it("matches hosts case insensitively", () => {
    expect(classify(`http://${FAKE_SANDBOX_HOST.toUpperCase()}/`)).toBe(
      "sandbox",
    );
  });

  // A wrong port is a different origin to the browser, so it must be to us.
  it("does not match the right hostname on the wrong port", () => {
    expect(classify("http://sandbox.test:9999/")).toBe("unknown");
  });

  it("does not match a subdomain of a configured host", () => {
    expect(classify(`http://evil.${FAKE_SANDBOX_HOST}/`)).toBe("unknown");
  });

  // Look-alike hosts are how an attacker gets artifact bytes onto an origin
  // the browser will treat as ours.
  it("does not match a host that merely ends with a configured host", () => {
    expect(classify("http://notsandbox.test:8787/")).toBe("unknown");
  });

  it("reports an unrelated host as unknown", () => {
    expect(classify("http://example.com/")).toBe("unknown");
  });

  // The fully qualified form reaches the same server and carries the same
  // cookies, so it has to resolve to the same origin rather than to unknown.
  it("treats a trailing root-label dot as the same host", () => {
    expect(classify("http://app.test.:8787/")).toBe("app");
    expect(classify("http://sandbox.test.:8787/")).toBe("sandbox");
  });
});
