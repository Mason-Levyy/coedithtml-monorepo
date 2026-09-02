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

  it("accepts a module script importing from a CDN, which a browser runs as-is", () => {
    const withModuleScript = `<!doctype html>
<html lang="en">
  <body>
    <canvas id="scene"></canvas>
    <script type="module">
      import * as THREE from "https://cdn.skypack.dev/three";
      export default null;
      const scene = new THREE.Scene();
      console.log(scene);
    </script>
  </body>
</html>`;
    expect(checkHtmlDocument(withModuleScript).ok).toBe(true);
  });

  it("still rejects a bare module source file that only looks like markup", () => {
    const source = `import { render } from "./render";
export default function Deck() {
  return null;
}`;
    expect(reasonFor(source)).toBe("needs-build-step");
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

  it("rejects a document that ships its own CSP meta tag", () => {
    const source = `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'"></head><body>hi</body></html>`;
    expect(reasonFor(source)).toBe("has-own-csp");
  });

  it("rejects a CSP meta tag regardless of attribute order or quote style", () => {
    const source = `<html><head><meta content='default-src self' http-equiv='content-security-policy'></head><body>hi</body></html>`;
    expect(reasonFor(source)).toBe("has-own-csp");
  });

  it("accepts a report-only CSP meta tag, which cannot break the runtime", () => {
    const source = `<html><head><meta http-equiv="Content-Security-Policy-Report-Only" content="default-src 'none'"></head><body>hi</body></html>`;
    expect(checkHtmlDocument(source).ok).toBe(true);
  });

  it("rejects a CSP meta tag with an unquoted http-equiv value", () => {
    const source = `<html><head><meta http-equiv=Content-Security-Policy content="default-src 'none'"></head><body>hi</body></html>`;
    expect(reasonFor(source)).toBe("has-own-csp");
  });
});

describe("a document written to make the checker work", () => {
  function withinASecond(source: string): number {
    const started = Date.now();
    checkHtmlDocument(source);
    return Date.now() - started;
  }

  it("finishes on an import that never says from", () => {
    const source = `<html><body>${"import a\n".repeat(200_000)}</body></html>`;

    expect(withinASecond(source)).toBeLessThan(1000);
  });

  it("finishes on a script tag that is never closed", () => {
    const source = `<html><body>${"<script ".repeat(200_000)}</body></html>`;

    expect(withinASecond(source)).toBeLessThan(1000);
  });

  it("finishes on a meta tag that is never closed", () => {
    const source = `<html><head>${"<meta ".repeat(200_000)}</head><body>hi</body></html>`;

    expect(withinASecond(source)).toBeLessThan(1000);
  });

  it("still finds a real import once the padding is out of the way", () => {
    const source = `<html><body>${"x".repeat(500_000)}\nimport React from "react";\n</body></html>`;

    expect(reasonFor(source)).toBe("needs-build-step");
  });

  it("still ignores markers that only appear inside a script", () => {
    const source = `<html><body><script>\nimport thing from "./thing.js";\n</script><p>hi</p></body></html>`;

    expect(checkHtmlDocument(source).ok).toBe(true);
  });

  it("ignores markers inside several scripts, not just the first", () => {
    const source = `<html><body><script>const a = 1;</script><p>hi</p><script>\nimport x from "y";\n</script></body></html>`;

    expect(checkHtmlDocument(source).ok).toBe(true);
  });
});
