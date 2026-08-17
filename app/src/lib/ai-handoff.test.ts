import { describe, expect, it } from "vitest";
import {
  handoffFor,
  MAX_PROMPT_URL_LENGTH,
  promptUrlFor,
  PROMPT_BASE_URL,
} from "./ai-handoff";

const SHORT = "Change the heading to Q3 and drop the last paragraph.";

describe("handing the changes to an AI tool", () => {
  it("opens each tool at the address that prefills a prompt", () => {
    expect(promptUrlFor("claude", SHORT)).toContain("claude.ai/new?q=");
    expect(promptUrlFor("chatgpt", SHORT)).toContain("chatgpt.com/?q=");
    expect(promptUrlFor("gemini", SHORT)).toContain("gemini.google.com/app?q=");
  });

  it("encodes a prompt that would otherwise break the query string", () => {
    const url = promptUrlFor("claude", 'Replace "a&b" with c=d');

    expect(url).not.toContain('"a&b"');
    expect(new URL(url).searchParams.get("q")).toBe('Replace "a&b" with c=d');
  });

  it("sends a short review straight into a new chat", () => {
    const handoff = handoffFor({ tool: "claude", feedback: SHORT });

    expect(handoff.kind).toBe("open");
  });

  it("falls back to the clipboard when the review is too long for a URL", () => {
    const handoff = handoffFor({
      tool: "claude",
      feedback: "x".repeat(MAX_PROMPT_URL_LENGTH),
    });

    expect(handoff).toEqual({
      kind: "copy",
      prompt: "x".repeat(MAX_PROMPT_URL_LENGTH),
    });
  });

  it("never builds a URL past the length that breaks in the wild", () => {
    const handoff = handoffFor({ tool: "gemini", feedback: SHORT });

    if (handoff.kind !== "open") {
      throw new Error("a short review should open directly");
    }
    expect(handoff.url.length).toBeLessThanOrEqual(MAX_PROMPT_URL_LENGTH);
  });

  it("has somewhere to open every tool it offers", () => {
    for (const url of Object.values(PROMPT_BASE_URL)) {
      expect(() => new URL(url)).not.toThrow();
    }
  });
});
