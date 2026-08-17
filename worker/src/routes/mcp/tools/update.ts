import { z } from "zod";
import type { WorkerEnv } from "@/lib/env";
import { accessTokenSchema } from "@/lib/schemas/artifact";
import {
  errorResult,
  textResult,
  type McpTool,
  type ToolResult,
} from "../tool";
import { postArtifact } from "./post-artifact";

const argumentsSchema = z.object({
  editToken: accessTokenSchema,
  html: z.string().min(1),
  fileName: z.string().min(1),
});

const DESCRIPTION = `Publish a rewritten version of an artifact already on Coedit. The link people are holding keeps working and their comments stay attached, so nobody has to be sent a new URL.

Needs the editToken from coedit_share_artifact. Send the whole revised file.

This does not report which comments still line up with the new text. Call coedit_read_feedback afterwards to see what survived the rewrite.`;

const INPUT_SCHEMA = {
  type: "object",
  properties: {
    editToken: {
      type: "string",
      description: "The editToken coedit_share_artifact returned.",
    },
    html: {
      type: "string",
      description: "The complete revised HTML document.",
    },
    fileName: {
      type: "string",
      description: "A name ending in .html.",
    },
  },
  required: ["editToken", "html", "fileName"],
} as const;

async function run(
  args: Record<string, unknown>,
  context: { request: Request; env: WorkerEnv },
): Promise<ToolResult> {
  const parsed = argumentsSchema.safeParse(args);
  if (!parsed.success) {
    return errorResult(
      "That call needs an editToken, the revised html, and a fileName ending in .html.",
    );
  }
  const { editToken, html, fileName } = parsed.data;

  const replaced = await postArtifact(
    {
      html,
      fileName,
      path: `/api/artifacts/${editToken}/revisions`,
      rateLimitKey: editToken,
      expect: 200,
      refusal:
        "Coedit would not take that revision. Only an edit link may replace a file.",
    },
    context,
  );
  if (!replaced.ok) {
    return errorResult(replaced.message);
  }

  return textResult(
    JSON.stringify(
      {
        revision: replaced.body.revision,
        note: "The link people already have now serves this version. Call coedit_read_feedback to see which comments still line up with it.",
      },
      null,
      2,
    ),
  );
}

export const updateArtifactTool: McpTool = {
  name: "coedit_update_artifact",
  title: "Publish a revised artifact",
  description: DESCRIPTION,
  inputSchema: INPUT_SCHEMA,
  run,
};
