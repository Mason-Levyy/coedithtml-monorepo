import { describe, expect, it } from "vitest";
import { resolvePrimaryContainer } from "./container";

function documentFromBodyHtml(html: string): Document {
  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = html;
  return doc;
}

describe("resolvePrimaryContainer", () => {
  it("prefers <main> when present", () => {
    const doc = documentFromBodyHtml(
      "<header>nav</header><main><h1>Content</h1></main>",
    );

    expect(resolvePrimaryContainer(doc)).toBe(doc.querySelector("main"));
  });

  it("falls back to <body> when there is no <main>", () => {
    const doc = documentFromBodyHtml("<h1>Content</h1>");

    expect(resolvePrimaryContainer(doc)).toBe(doc.body);
  });
});
