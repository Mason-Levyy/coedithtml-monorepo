import { describe, expect, it } from "vitest";
import { roomUrl } from "@/lib/room-url";

const TOKEN = "a".repeat(32);

describe("roomUrl", () => {
  it("dials the app origin, never the sandbox", () => {
    const url = roomUrl({
      token: TOKEN,
      artifactUrl: `https://sandbox.test/${TOKEN}`,
      origin: "https://app.test",
    });

    expect(url).toBe(`wss://app.test/api/artifacts/${TOKEN}/room`);
  });

  it("stays unencrypted only where the page already is", () => {
    const url = roomUrl({
      token: TOKEN,
      artifactUrl: `http://sandbox.localhost:8787/${TOKEN}`,
      origin: "http://app.localhost:8787",
    });

    expect(url.startsWith("ws://app.localhost:8787/")).toBe(true);
  });

  it("carries the unlock grant so a locked artifact's room stays reachable", () => {
    const url = roomUrl({
      token: TOKEN,
      artifactUrl: `https://sandbox.test/${TOKEN}?u=grant-value`,
      origin: "https://app.test",
    });

    expect(new URL(url).searchParams.get("u")).toBe("grant-value");
  });

  it("asks for no grant when the artifact needed none", () => {
    const url = roomUrl({
      token: TOKEN,
      artifactUrl: `https://sandbox.test/${TOKEN}`,
      origin: "https://app.test",
    });

    expect(new URL(url).searchParams.has("u")).toBe(false);
  });

  it("still builds a room URL when the artifact URL is unreadable", () => {
    const url = roomUrl({
      token: TOKEN,
      artifactUrl: "not a url",
      origin: "https://app.test",
    });

    expect(url).toBe(`wss://app.test/api/artifacts/${TOKEN}/room`);
  });
});
