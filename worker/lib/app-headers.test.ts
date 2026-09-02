import { describe, expect, it } from "vitest";
import {
  appContentSecurityPolicy,
  appSecurityHeaders,
} from "@/lib/app-headers";

const SANDBOX = "https://sandbox.test:8787";

function directives(): string[] {
  return appContentSecurityPolicy(SANDBOX)
    .split(";")
    .map((directive) => directive.trim());
}

describe("what the app origin says about itself", () => {
  it("may frame the sandbox", () => {
    expect(directives()).toContain(`frame-src ${SANDBOX}`);
  });

  it("may not be framed by anything, the sandbox included", () => {
    expect(directives()).toContain("frame-ancestors 'none'");
  });

  it("runs no script it did not ship", () => {
    expect(directives()).toContain("default-src 'self'");
    expect(appContentSecurityPolicy(SANDBOX)).not.toContain("unsafe-eval");
    expect(appContentSecurityPolicy(SANDBOX)).not.toContain(
      "script-src 'unsafe-inline'",
    );
  });

  it("carries the headers the asset router never set", () => {
    const headers = appSecurityHeaders(SANDBOX);

    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("strict-transport-security")).toContain("max-age=");
    expect(headers.get("cross-origin-opener-policy")).toBe("same-origin");
    expect(headers.get("link")).toContain('rel="api-catalog"');
    expect(headers.get("link")).toContain('rel="agent-card"');
  });
});
