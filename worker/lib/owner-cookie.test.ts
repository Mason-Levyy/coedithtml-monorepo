import { describe, expect, it } from "vitest";
import {
  isValidOwnerId,
  ownerCookieHeader,
  ownerIdFrom,
  resolveOwnerId,
  withOwnerCookie,
} from "./owner-cookie";

describe("owner-cookie", () => {
  it("validates 32-char hex owner IDs", () => {
    expect(isValidOwnerId("a".repeat(32))).toBe(true);
    expect(isValidOwnerId("0123456789abcdef0123456789abcdef")).toBe(true);
    expect(isValidOwnerId("short")).toBe(false);
    expect(isValidOwnerId("g".repeat(32))).toBe(false);
    expect(isValidOwnerId("")).toBe(false);
  });

  it("extracts owner ID from cookie header", () => {
    const validId = "1234567890abcdef1234567890abcdef";
    const request = new Request("https://app.test/api/artifacts", {
      headers: {
        cookie: `other=abc; coedit_owner=${validId}; test=1`,
      },
    });

    expect(ownerIdFrom(request)).toBe(validId);
  });

  it("returns null if coedit_owner cookie is missing or invalid", () => {
    const req1 = new Request("https://app.test/api/artifacts");
    expect(ownerIdFrom(req1)).toBeNull();

    const req2 = new Request("https://app.test/api/artifacts", {
      headers: { cookie: "coedit_owner=invalid-id" },
    });
    expect(ownerIdFrom(req2)).toBeNull();
  });

  it("resolves existing owner ID with isNew=false", () => {
    const validId = "1234567890abcdef1234567890abcdef";
    const request = new Request("https://app.test/api/artifacts", {
      headers: { cookie: `coedit_owner=${validId}` },
    });

    const result = resolveOwnerId(request);
    expect(result.ownerId).toBe(validId);
    expect(result.isNew).toBe(false);
  });

  it("mints new owner ID with isNew=true when none exists", () => {
    const request = new Request("https://app.test/api/artifacts");
    const result = resolveOwnerId(request);
    expect(isValidOwnerId(result.ownerId)).toBe(true);
    expect(result.isNew).toBe(true);
  });

  it("formats owner cookie header correctly", () => {
    const validId = "1234567890abcdef1234567890abcdef";
    const header = ownerCookieHeader(validId);
    expect(header).toBe(
      `coedit_owner=${validId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax; Secure`,
    );
  });

  it("attaches Set-Cookie when isNew is true", () => {
    const validId = "1234567890abcdef1234567890abcdef";
    const initial = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const modified = withOwnerCookie(initial, validId, true);
    expect(modified.headers.get("Set-Cookie")).toContain(
      `coedit_owner=${validId}`,
    );
    expect(modified.headers.get("Content-Type")).toBe("application/json");
  });

  it("leaves response untouched when isNew is false", () => {
    const validId = "1234567890abcdef1234567890abcdef";
    const initial = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const modified = withOwnerCookie(initial, validId, false);
    expect(modified.headers.get("Set-Cookie")).toBeNull();
  });
});
