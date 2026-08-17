import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseOverlayEntry } from "@coedithtml/protocol";
import { describe, expect, it } from "vitest";
import { EM_DASH_SENTENCE, tutorialEntries } from "./tutorial-seed";

const workerDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const REVISION = "9f2c1a04b7e35d68";

async function deckText(): Promise<string> {
  const html = await readFile(
    path.join(workerDir, "tutorial/deck.html"),
    "utf8",
  );
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&middot;/g, "·")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

const entries = tutorialEntries({ revision: REVISION, now: new Date(0) });

describe("tutorialEntries", () => {
  it("produces entries the room will accept", () => {
    for (const entry of entries) {
      expect(parseOverlayEntry(JSON.parse(JSON.stringify(entry)))).not.toBe(
        null,
      );
    }
  });

  it("stamps every anchor with the revision it was written against", () => {
    for (const entry of entries) {
      expect(entry.anchor.revision).toBe(REVISION);
    }
  });

  it("lists the notes in the order the tour introduces them", () => {
    const stamps = entries.map((entry) => entry.createdAt);
    expect([...stamps].sort()).toStrictEqual(stamps);
  });

  it("carries the notes the tour asks the reader to act on", () => {
    const bodies = entries.map((entry) => entry.body);
    expect(bodies).toContain("Can you elaborate here?");
    expect(bodies).toContain("This is my favorite part");
    expect(bodies).toContain("I think it looks great!");
    expect(bodies).toContain("FIX THIS!");
    expect(bodies).toContain("Can we change the order here?");
    expect(bodies.some((body) => body.includes("em dashes"))).toBe(true);
    expect(bodies).toContain("Try it for yourself!");
  });

  it("quotes text that appears exactly once in the deck", async () => {
    const text = await deckText();
    for (const entry of entries) {
      if (entry.anchor.kind === "text") {
        expect(occurrences(text, entry.anchor.quote)).toBe(1);
      }
    }
  });

  // The last step asks the reader to strike out every em dash on the page. A
  // second one somewhere else would make that instruction a lie.
  it("leaves exactly one em-dashed sentence on the page", async () => {
    const text = await deckText();
    expect(occurrences(text, "—")).toBe(2);
    expect(text).toContain(EM_DASH_SENTENCE);
  });
});
