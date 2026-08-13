import { describe, expect, it } from "vitest";
import { artifactSrcFor } from "./artifact-src";

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
