import { describe, expect, it } from "vitest";
import { deriveLabel } from "./label";

function elementsFromHtml(html: string): Element[] {
  const container = document.createElement("div");
  container.innerHTML = html;
  return [...container.children];
}

describe("deriveLabel", () => {
  it("uses the first heading found in the range", () => {
    const range = elementsFromHtml(
      "<div><p>intro</p><h2>  Q3   Results  </h2></div><p>more</p>",
    );

    expect(deriveLabel(range, 0)).toBe("Q3 Results");
  });

  it("finds a heading nested inside a wrapper", () => {
    const range = elementsFromHtml(
      "<div><header><h1>Welcome</h1></header></div>",
    );

    expect(deriveLabel(range, 0)).toBe("Welcome");
  });

  it("falls back to the first text content when there is no heading", () => {
    const range = elementsFromHtml("<p>Just a paragraph of text</p>");

    expect(deriveLabel(range, 0)).toBe("Just a paragraph of text");
  });

  it("falls back to a positional label when there is no text at all", () => {
    const range = elementsFromHtml('<img src="a.png"><div></div>');

    expect(deriveLabel(range, 2)).toBe("Slide 3");
  });

  it("truncates long labels", () => {
    const longText = "x".repeat(200);
    const range = elementsFromHtml(`<h2>${longText}</h2>`);

    const label = deriveLabel(range, 0);
    expect(label.length).toBe(80);
    expect(label.endsWith("…")).toBe(true);
  });
});
