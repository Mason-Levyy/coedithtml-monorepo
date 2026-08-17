import { z } from "zod";
import type { WorkerEnv } from "@/lib/env";
import { accessTokenSchema } from "@/lib/schemas/artifact";
import { MCP_MAX_ARTIFACT_BYTES, chargeMcpUpload } from "../ceilings";
import { callApp, jsonOf } from "../dispatch";
import {
  errorResult,
  textResult,
  type McpTool,
  type ToolResult,
} from "../tool";

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

  if (new TextEncoder().encode(html).byteLength > MCP_MAX_ARTIFACT_BYTES) {
    return errorResult(
      "That file is over 1MB, which is more than this connector will carry.",
    );
  }

  const refused = await chargeMcpUpload(context.request, context.env);
  if (refused !== null) {
    return errorResult(refused);
  }

  const form = new FormData();
  form.append("file", new File([html], fileName, { type: "text/html" }));

  const replaced = await callApp(context.env, {
    path: `/api/artifacts/${editToken}/revisions`,
    method: "POST",
    rateLimitKey: editToken,
    body: form,
  });

  const body = jsonOf(replaced);
  if (replaced.status !== 200 || body === null) {
    const reason = body?.error;
    return errorResult(
      typeof reason === "string"
        ? reason
        : "Coedit would not take that revision. Only an edit link may replace a file.",
    );
  }

  return textResult(
    JSON.stringify(
      {
        revision: body.revision,
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
