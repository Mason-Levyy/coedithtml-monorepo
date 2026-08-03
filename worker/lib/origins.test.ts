import { describe, expect, it } from "vitest";
import {
  classifyRequestOrigin,
  originFor,
  redirectTargetFor,
  type OriginConfig,
} from "./origins";
import {
  FAKE_APP_HOST,
  FAKE_REDIRECT_HOST,
  FAKE_REDIRECT_TARGET,
  FAKE_SANDBOX_HOST,
} from "./fakes";

const config: OriginConfig = {
  APP_HOST: FAKE_APP_HOST,
  SANDBOX_HOST: FAKE_SANDBOX_HOST,
  REDIRECT_HOSTS: [FAKE_REDIRECT_HOST],
  REDIRECT_TARGET: FAKE_REDIRECT_TARGET,
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

  it("does not match the right hostname on the wrong port", () => {
    expect(classify("http://sandbox.test:9999/")).toBe("unknown");
  });

  it("does not match a subdomain of a configured host", () => {
    expect(classify(`http://evil.${FAKE_SANDBOX_HOST}/`)).toBe("unknown");
  });

  it("does not match a host that merely ends with a configured host", () => {
    expect(classify("http://notsandbox.test:8787/")).toBe("unknown");
  });

  it("reports an unrelated host as unknown", () => {
    expect(classify("http://example.com/")).toBe("unknown");
  });

  it("treats a trailing root-label dot as the same host", () => {
    expect(classify("http://app.test.:8787/")).toBe("app");
    expect(classify("http://sandbox.test.:8787/")).toBe("sandbox");
  });
});

describe("redirectTargetFor", () => {
  function target(url: string) {
    return redirectTargetFor(new Request(url), config)?.toString() ?? null;
  }

  it("sends a redirect host to the canonical host", () => {
    expect(target(`http://${FAKE_REDIRECT_HOST}/`)).toBe(
      `https://${FAKE_REDIRECT_TARGET}/`,
    );
  });

  it("keeps the path and query", () => {
    expect(target(`http://${FAKE_REDIRECT_HOST}/pricing?ref=x`)).toBe(
      `https://${FAKE_REDIRECT_TARGET}/pricing?ref=x`,
    );
  });

  it("upgrades the redirect to https", () => {
    expect(target(`http://${FAKE_REDIRECT_HOST}/`)).toMatch(/^https:/);
  });

  it("leaves the app and sandbox origins alone", () => {
    expect(target(`http://${FAKE_APP_HOST}/`)).toBeNull();
    expect(target(`http://${FAKE_SANDBOX_HOST}/`)).toBeNull();
  });

  it("ignores hosts it was never told to redirect", () => {
    expect(target("http://example.com/")).toBeNull();
  });
});

describe("originFor", () => {
  it("combines the request's protocol with the given host", () => {
    expect(
      originFor(
        new Request("https://app.test/api/artifacts"),
        FAKE_SANDBOX_HOST,
      ),
    ).toBe(`https://${FAKE_SANDBOX_HOST}`);
  });

  it("preserves an http request's protocol for local dev", () => {
    expect(
      originFor(new Request("http://app.test:8787/"), FAKE_SANDBOX_HOST),
    ).toBe(`http://${FAKE_SANDBOX_HOST}`);
  });
});
