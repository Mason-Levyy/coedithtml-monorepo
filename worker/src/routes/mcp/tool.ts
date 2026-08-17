import type { WorkerEnv } from "@/lib/env";

export type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

export type McpTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (
    args: Record<string, unknown>,
    context: { request: Request; env: WorkerEnv },
  ) => Promise<ToolResult>;
};

export function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

export function errorResult(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}
