import { describe, expect, it } from "vitest";
import {
  artifactSrcFor,
  frameSrcFor,
  withoutUnlockGrant,
} from "./artifact-src";

describe("artifactSrcFor", () => {
  it("carries the revision so a replaced file reloads the frame", () => {
    const before = artifactSrcFor({
      artifactUrl: "https://sandbox.example.com/tok",
      revision: "aaaa1111",
    });
    const after = artifactSrcFor({
      artifactUrl: "https://sandbox.example.com/tok",
      revision: "bbbb2222",
    });

    expect(before).toBe("https://sandbox.example.com/tok?r=aaaa1111");
    expect(after).not.toBe(before);
  });

  it("keeps an unlock grant that is already on the URL", () => {
    expect(
      artifactSrcFor({
        artifactUrl: "https://sandbox.example.com/tok?u=9999",
        revision: "aaaa1111",
      }),
    ).toBe("https://sandbox.example.com/tok?u=9999&r=aaaa1111");
  });
});

describe("withoutUnlockGrant", () => {
  it("drops the grant, so a password stays out of anything we hand an AI tool", () => {
    expect(
      withoutUnlockGrant("https://sandbox.example.com/tok?u=9999&r=aaaa1111"),
    ).toBe("https://sandbox.example.com/tok?r=aaaa1111");
  });

  it("leaves a URL that never had one alone", () => {
    expect(
      withoutUnlockGrant("https://sandbox.example.com/tok?r=aaaa1111"),
    ).toBe("https://sandbox.example.com/tok?r=aaaa1111");
  });
});

describe("frameSrcFor", () => {
  const SRC = "https://sandbox.example.com/tok?r=aaaa1111";

  it("leaves the URL alone until something has been put back", () => {
    expect(frameSrcFor(SRC, 0)).toBe(SRC);
  });

  it("gives the frame a new URL for every reset, so it reloads", () => {
    expect(frameSrcFor(SRC, 1)).toBe(`${SRC}&reset=1`);
    expect(frameSrcFor(SRC, 2)).not.toBe(frameSrcFor(SRC, 1));
  });
});
