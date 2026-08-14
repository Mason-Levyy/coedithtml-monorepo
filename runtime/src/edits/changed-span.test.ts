import { describe, expect, it } from "vitest";
import { changedSpan } from "./changed-span";

describe("changedSpan", () => {
  it("finds a word swapped in the middle", () => {
    expect(changedSpan("Revenue grew 18%", "Revenue fell 18%")).toEqual({
      start: 8,
      end: 12,
      text: "fell",
    });
  });

  it("finds text added at the end", () => {
    expect(changedSpan("Revenue grew", "Revenue grew fast")).toEqual({
      start: 12,
      end: 12,
      text: " fast",
    });
  });

  it("finds text removed from the start", () => {
    expect(changedSpan("The revenue grew", "revenue grew")).toEqual({
      start: 0,
      end: 4,
      text: "",
    });
  });

  it("reports nothing when the text is untouched", () => {
    expect(changedSpan("Revenue grew", "Revenue grew")).toBeNull();
  });

  it("keeps a shared ending out of the span it reports", () => {
    const span = changedSpan("Alpha", "Beta");

    expect(span).toEqual({ start: 0, end: 4, text: "Bet" });
    expect("Alpha".slice(0, 0) + "Bet" + "Alpha".slice(4)).toBe("Beta");
  });

  it("does not run the tail past the head on a repeated character", () => {
    const span = changedSpan("aaa", "aa");

    expect(span).not.toBeNull();
    expect(span && span.start + span.text.length).toBeLessThanOrEqual(2);
  });
});
