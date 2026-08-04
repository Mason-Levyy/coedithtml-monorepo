import { describe, expect, it } from "vitest";
import { viewerTokenFromPath } from "./viewer-path";

const TOKEN = "a".repeat(32);

describe("viewerTokenFromPath", () => {
  it("reads the token out of a viewer path", () => {
    expect(viewerTokenFromPath(`/a/${TOKEN}`)).toBe(TOKEN);
  });

  it("tolerates a trailing slash", () => {
    expect(viewerTokenFromPath(`/a/${TOKEN}/`)).toBe(TOKEN);
  });

  it("returns null for the landing page", () => {
    expect(viewerTokenFromPath("/")).toBeNull();
  });

  it("returns null for a token that is not the right shape", () => {
    expect(viewerTokenFromPath("/a/not-a-token")).toBeNull();
    expect(viewerTokenFromPath(`/a/${"a".repeat(31)}`)).toBeNull();
    expect(viewerTokenFromPath(`/a/${"A".repeat(32)}`)).toBeNull();
  });

  it("returns null for a nested path under a token", () => {
    expect(viewerTokenFromPath(`/a/${TOKEN}/edit`)).toBeNull();
  });
});
