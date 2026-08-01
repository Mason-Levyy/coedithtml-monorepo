import { describe, expect, it } from "vitest";
import { checkHtmlDocument } from "./html-document";

function reasonFor(source: string) {
  const result = checkHtmlDocument(source);
  return result.ok ? null : result.reason;
}

const COMPLETE_DOCUMENT = `<!doctype html>
<html lang="en">
  <head><style>body { color: rebeccapurple }</style></head>
  <body><section><h1>Q3</h1></section><script>console.log(1)</script></body>
</html>`;

describe("checkHtmlDocument", () => {
  it("accepts a single-file document with inline CSS and JS", () => {
    expect(checkHtmlDocument(COMPLETE_DOCUMENT).ok).toBe(true);
  });

  it("accepts uppercase and spaced tags", () => {
    expect(checkHtmlDocument("<HTML><body>hi</body></HTML   >").ok).toBe(true);
  });

  it("rejects a fragment with no html element", () => {
    expect(reasonFor("<div><h1>Just a fragment</h1></div>")).toBe("not-html");
  });

  it("rejects a truncated document", () => {
    expect(reasonFor("<!doctype html><html><body>cut off")).toBe(
      "no-closing-html-tag",
    );
  });

  it("rejects JSX, which needs a build step", () => {
    const jsx = `import React from "react";
export default function Deck() {
  return <Slide title="Q3" />;
}`;
    expect(reasonFor(jsx)).toBe("needs-build-step");
  });

  it("rejects a component file even when it contains html tags", () => {
    const jsx = `export default function Page() {
  return <html><body><Chart /></body></html>;
}`;
    expect(reasonFor(jsx)).toBe("needs-build-step");
  });

  it("rejects an empty file", () => {
    expect(reasonFor("")).toBe("not-html");
  });

  it("does not treat the word html in text as a tag", () => {
    expect(reasonFor("<p>we love html files</p>")).toBe("not-html");
  });

  it("treats capitalized elements as needing a build step", () => {
    expect(reasonFor("<html><body><MyWidget /></body></html>")).toBe(
      "needs-build-step",
    );
  });
});
