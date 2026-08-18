import { describe, expect, it } from "vitest";
import { isElementVisible } from "./visibility";

describe("isElementVisible", () => {
  it("returns false for null or disconnected elements", () => {
    expect(isElementVisible(null)).toBe(false);
    const div = document.createElement("div");
    expect(isElementVisible(div)).toBe(false);
  });

  it("returns true for standard connected elements", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    try {
      expect(isElementVisible(div)).toBe(true);
    } finally {
      div.remove();
    }
  });

  it("returns false when element has display: none", () => {
    const div = document.createElement("div");
    div.style.display = "none";
    document.body.appendChild(div);
    try {
      expect(isElementVisible(div)).toBe(false);
    } finally {
      div.remove();
    }
  });

  it("returns false when element has visibility: hidden or collapse", () => {
    const hiddenDiv = document.createElement("div");
    hiddenDiv.style.visibility = "hidden";
    document.body.appendChild(hiddenDiv);

    const collapseDiv = document.createElement("div");
    collapseDiv.style.visibility = "collapse";
    document.body.appendChild(collapseDiv);

    try {
      expect(isElementVisible(hiddenDiv)).toBe(false);
      expect(isElementVisible(collapseDiv)).toBe(false);
    } finally {
      hiddenDiv.remove();
      collapseDiv.remove();
    }
  });

  it("returns false when element has opacity: 0", () => {
    const zeroDiv = document.createElement("div");
    zeroDiv.style.opacity = "0";
    document.body.appendChild(zeroDiv);

    const semiDiv = document.createElement("div");
    semiDiv.style.opacity = "0.5";
    document.body.appendChild(semiDiv);

    try {
      expect(isElementVisible(zeroDiv)).toBe(false);
      expect(isElementVisible(semiDiv)).toBe(true);
    } finally {
      zeroDiv.remove();
      semiDiv.remove();
    }
  });

  it("returns false when an ancestor is hidden via display, visibility, or opacity", () => {
    const parent = document.createElement("div");
    const child = document.createElement("p");
    parent.appendChild(child);
    document.body.appendChild(parent);

    try {
      expect(isElementVisible(child)).toBe(true);

      parent.style.visibility = "hidden";
      expect(isElementVisible(child)).toBe(false);

      parent.style.visibility = "visible";
      parent.style.opacity = "0";
      expect(isElementVisible(child)).toBe(false);

      parent.style.opacity = "1";
      parent.style.display = "none";
      expect(isElementVisible(child)).toBe(false);
    } finally {
      parent.remove();
    }
  });

  it("honors native checkVisibility if present on the element", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    div.checkVisibility = () => false;
    try {
      expect(isElementVisible(div)).toBe(false);
    } finally {
      div.remove();
    }
  });
});
