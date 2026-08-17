import { downloadUrlFor } from "@/lib/download-artifact";

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

export type ConnectorHandoff = {
  editToken: string;
  fileName: string;
  artifactUrl: string;
};

export function connectorPrompt(handoff: ConnectorHandoff): string {
  return [
    `Apply the review people left on my Coedit copy of ${handoff.fileName}.`,
    `Call coedit_read_feedback with the token ${handoff.editToken} for the list of changes. Make exactly those changes and nothing else, then publish the result with coedit_update_artifact using the same token.`,
    `Without Coedit's tools: read the changes at ${downloadUrlFor(handoff.artifactUrl, "feedback")}, read the file at ${handoff.artifactUrl}, and hand the rewritten file back to me instead.`,
  ].join("\n\n");
}

export type Handoff =
  { kind: "open"; url: string } | { kind: "copy"; prompt: string };

function within(tool: AiTool, prompt: string): Handoff | null {
  const url = promptUrlFor(tool, prompt);
  return url.length <= MAX_PROMPT_URL_LENGTH ? { kind: "open", url } : null;
}

export function handoffFor(options: {
  tool: AiTool;
  feedback: string;
  connector?: ConnectorHandoff | null;
}): Handoff {
  const connector = options.connector ?? null;
  if (connector !== null) {
    const opened = within(options.tool, connectorPrompt(connector));
    if (opened !== null) {
      return opened;
    }
  }
  return (
    within(options.tool, options.feedback) ?? {
      kind: "copy",
      prompt: options.feedback,
    }
  );
}
