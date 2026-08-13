import { describe, expect, it } from "vitest";
import { downloadUrlFor } from "./download-artifact";

describe("downloadUrlFor", () => {
  it("asks the sandbox origin for the download, not the app", () => {
    const url = downloadUrlFor("https://sandbox.test/token123", "edits");

    expect(url).toBe("https://sandbox.test/token123?download=edits");
  });

  it("keeps the revision the frame is already showing", () => {
    const url = downloadUrlFor(
      "https://sandbox.test/token123?r=9f2c",
      "everything",
    );

    expect(new URL(url).searchParams.get("r")).toBe("9f2c");
    expect(new URL(url).searchParams.get("download")).toBe("everything");
  });

  it("replaces a stale choice rather than adding a second one", () => {
    const once = downloadUrlFor(
      "https://sandbox.test/t?download=edits",
      "feedback",
    );

    expect(once.match(/download=/g)).toHaveLength(1);
    expect(new URL(once).searchParams.get("download")).toBe("feedback");
  });
});
