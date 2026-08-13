import { describe, expect, it } from "vitest";
import { revisionOf } from "./content-hash";

function encode(source: string): ArrayBuffer {
  return new Uint8Array(new TextEncoder().encode(source)).buffer;
}

describe("revisionOf", () => {
  it("gives the same revision to the same bytes", async () => {
    const html = "<html><body>Q3</body></html>";

    expect(await revisionOf(encode(html))).toBe(await revisionOf(encode(html)));
  });

  it("gives a different revision to a one-character edit", async () => {
    const before = await revisionOf(encode("<html><body>Q3</body></html>"));
    const after = await revisionOf(encode("<html><body>Q4</body></html>"));

    expect(after).not.toBe(before);
  });

  it("is a fixed-length lowercase hex string", async () => {
    expect(await revisionOf(encode(""))).toMatch(/^[0-9a-f]{16}$/);
  });
});
