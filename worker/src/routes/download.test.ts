import { describe, expect, it } from "vitest";
import { contentDisposition } from "./download";

describe("naming a downloaded file", () => {
  it("names an ordinary file plainly", () => {
    expect(contentDisposition("deck-edited.html")).toContain(
      'filename="deck-edited.html"',
    );
  });

  it("survives a name a header cannot hold", () => {
    const header = contentDisposition("第三四半期-edited.html");

    expect(() => new Headers({ "content-disposition": header })).not.toThrow();
    expect(header).toContain("filename*=UTF-8''");
    expect(header).toContain("%E7%AC%AC");
  });

  it("leaves an ASCII fallback any client can read", () => {
    expect(contentDisposition("計画🎉.html")).toContain('filename="___.html"');
  });

  it("cannot be talked out of the header with a quote", () => {
    const header = contentDisposition('a"; download="evil.html');

    expect(header).toBe(
      "attachment; filename=\"a; download=evil.html\"; filename*=UTF-8''a%22%3B%20download%3D%22evil.html",
    );
  });

  it("escapes the characters RFC 5987 does not leave alone", () => {
    expect(contentDisposition("a'b(c)*d!.html")).toContain(
      "filename*=UTF-8''a%27b%28c%29%2Ad%21.html",
    );
  });
});
