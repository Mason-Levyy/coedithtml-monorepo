export const AI_TOOLS = ["claude", "chatgpt", "gemini"] as const;

export type AiTool = (typeof AI_TOOLS)[number];

export const AI_TOOL_LABEL: Record<AiTool, string> = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
};

export const PROMPT_BASE_URL: Record<AiTool, string> = {
  claude: "https://claude.ai/new",
  chatgpt: "https://chatgpt.com/",
  gemini: "https://gemini.google.com/app",
};

export const MAX_PROMPT_URL_LENGTH = 2000;

export function promptUrlFor(tool: AiTool, prompt: string): string {
  const url = new URL(PROMPT_BASE_URL[tool]);
  url.searchParams.set("q", prompt);
  return url.toString();
}

export type Handoff =
  { kind: "open"; url: string } | { kind: "copy"; prompt: string };

export function handoffFor(options: {
  tool: AiTool;
  feedback: string;
}): Handoff {
  const inline = promptUrlFor(options.tool, options.feedback);
  return inline.length <= MAX_PROMPT_URL_LENGTH
    ? { kind: "open", url: inline }
    : { kind: "copy", prompt: options.feedback };
}
