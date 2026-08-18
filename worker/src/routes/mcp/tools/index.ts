import type { McpTool } from "../tool";
import { readFeedbackTool } from "./feedback";
import { shareArtifactTool } from "./share";
import { updateArtifactTool } from "./update";
import { getUploadLinkTool } from "./upload-link";

export const TOOLS: McpTool[] = [
  shareArtifactTool,
  readFeedbackTool,
  updateArtifactTool,
  getUploadLinkTool,
];

export function toolNamed(name: string): McpTool | null {
  return TOOLS.find((tool) => tool.name === name) ?? null;
}

export function toolListing(): Record<string, unknown>[] {
  return TOOLS.map(({ name, title, description, inputSchema }) => ({
    name,
    title,
    description,
    inputSchema,
  }));
}
