import { describe, expect, it } from "vitest";
import {
  connectorPrompt,
  handoffFor,
  MAX_PROMPT_URL_LENGTH,
  promptUrlFor,
  PROMPT_BASE_URL,
  type AiTool,
} from "./ai-handoff";

const SHORT = "Change the heading to Q3 and drop the last paragraph.";

const CONNECTOR = {
  editToken: "e".repeat(32),
  fileName: "q3-review.html",
  artifactUrl: "https://coedit.coedithtml-worker.workers.dev/" + "a".repeat(32),
};

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

describe("the connector handoff", () => {
  it("carries the token the model needs to publish the rewrite back", () => {
    const prompt = connectorPrompt(CONNECTOR);

    expect(prompt).toContain(CONNECTOR.editToken);
    expect(prompt).toContain("coedit_read_feedback");
    expect(prompt).toContain("coedit_update_artifact");
  });

  it("names the file so the chat says what it is working on", () => {
    expect(connectorPrompt(CONNECTOR)).toContain("q3-review.html");
  });

  it("still works for a chat with no Coedit tools", () => {
    const prompt = connectorPrompt(CONNECTOR);

    expect(prompt).toContain(`${CONNECTOR.artifactUrl}?download=feedback`);
    expect(prompt).toContain(CONNECTOR.artifactUrl);
  });

  it("keeps the download URL valid when the artifact URL already has a query", () => {
    const prompt = connectorPrompt({
      ...CONNECTOR,
      artifactUrl: `${CONNECTOR.artifactUrl}?r=aaaa1111`,
    });

    expect(prompt).toContain("?r=aaaa1111&download=feedback");
  });

  it("opens in one click for every tool, however long the review is", () => {
    for (const tool of Object.keys(PROMPT_BASE_URL) as AiTool[]) {
      const handoff = handoffFor({
        tool,
        feedback: "x".repeat(50_000),
        connector: CONNECTOR,
      });

      expect(handoff.kind).toBe("open");
      if (handoff.kind === "open") {
        expect(handoff.url.length).toBeLessThanOrEqual(MAX_PROMPT_URL_LENGTH);
      }
    }
  });

  it("leaves the whole review in the prompt when there is no edit token", () => {
    const handoff = handoffFor({
      tool: "claude",
      feedback: SHORT,
      connector: null,
    });

    if (handoff.kind !== "open") {
      throw new Error("a short review should open directly");
    }
    expect(new URL(handoff.url).searchParams.get("q")).toBe(SHORT);
  });

  it("prefers the token over the payload, so the rewrite can publish back", () => {
    const handoff = handoffFor({
      tool: "claude",
      feedback: SHORT,
      connector: CONNECTOR,
    });

    if (handoff.kind !== "open") {
      throw new Error("the connector prompt should always fit a URL");
    }
    expect(new URL(handoff.url).searchParams.get("q")).toContain(
      CONNECTOR.editToken,
    );
  });
});
