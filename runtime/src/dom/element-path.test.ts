import { beforeEach, describe, expect, it } from "vitest";
import { elementForPath, pathToElement, sharedPathDepth } from "./element-path";

function query(selector: string): Element {
  const element = document.querySelector(selector);
  if (element === null) {
    throw new Error(`no element matching ${selector}`);
  }
  return element;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("pathToElement", () => {
  it("counts position among siblings of the same tag only", () => {
    document.body.innerHTML = `<div><h2>A</h2><p>one</p><p>two</p></div>`;

    expect(pathToElement(query("p:last-of-type"))).toBe("div[1]/p[2]");
  });

  it("gives the body itself an empty path", () => {
    expect(pathToElement(document.body)).toBe("");
  });
});

describe("elementForPath", () => {
  it("round-trips every element in the document", () => {
    document.body.innerHTML = `<section><ul><li>a</li><li>b</li></ul></section>`;
    const target = query("li:last-of-type");

    expect(elementForPath(pathToElement(target))).toBe(target);
  });

  it("returns null when the path no longer leads anywhere", () => {
    document.body.innerHTML = `<div><p>one</p></div>`;

    expect(elementForPath("div[1]/p[4]")).toBeNull();
    expect(elementForPath("table[1]")).toBeNull();
  });

  it("refuses a path it cannot parse rather than guessing", () => {
    document.body.innerHTML = `<div><p>one</p></div>`;

    expect(elementForPath("div[1]/p")).toBeNull();
  });
});

describe("sharedPathDepth", () => {
  it("measures how far two paths agree from the root down", () => {
    expect(sharedPathDepth("section[2]/p[1]", "section[2]/p[1]")).toBe(2);
    expect(sharedPathDepth("section[2]/p[1]", "section[2]/p[3]")).toBe(1);
    expect(sharedPathDepth("section[2]/p[1]", "section[5]/p[1]")).toBe(0);
  });
});
