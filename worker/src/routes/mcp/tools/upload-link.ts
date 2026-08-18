import { z } from "zod";
import type { WorkerEnv } from "@/lib/env";
import { originFor } from "@/lib/origins";
import {
  accessTokenSchema,
  MAX_ARTIFACT_BYTES,
  uploadFieldName,
} from "@/lib/schemas/artifact";
import {
  errorResult,
  textResult,
  type McpTool,
  type ToolResult,
} from "../tool";
import { resolveEditableArtifact } from "./resolve-editable-artifact";

const argumentsSchema = z.object({ editToken: accessTokenSchema });

const MAX_MEGABYTES = Math.round(MAX_ARTIFACT_BYTES / (1024 * 1024));

const DESCRIPTION = `Get a direct upload URL for a revised artifact too large to send through coedit_update_artifact, whose html argument tops out around 1MB. A file with embedded images easily exceeds that.

Needs the editToken from coedit_share_artifact. POST the revised file as multipart/form-data straight to the URL this returns -- the bytes in a field named "${uploadFieldName}", up to ${MAX_MEGABYTES}MB, no editToken or JSON wrapper needed since the URL already carries it. The link people are already holding starts serving that revision as soon as the upload finishes.

Call coedit_read_feedback afterwards to see what survived the rewrite.`;

const INPUT_SCHEMA = {
  type: "object",
  properties: {
    editToken: {
      type: "string",
      description: "The editToken coedit_share_artifact returned.",
    },
  },
  required: ["editToken"],
} as const;

async function run(
  args: Record<string, unknown>,
  context: { request: Request; env: WorkerEnv },
): Promise<ToolResult> {
  const parsed = argumentsSchema.safeParse(args);
  if (!parsed.success) {
    return errorResult(
      "That call needs the editToken from coedit_share_artifact.",
    );
  }
  const { editToken } = parsed.data;

  const resolved = await resolveEditableArtifact(context.env, editToken);
  if (!resolved.ok) {
    return errorResult(resolved.message);
  }

  const uploadUrl = `${originFor(context.env.APP_HOST)}/api/artifacts/${editToken}/revisions`;

  return textResult(
    JSON.stringify(
      {
        uploadUrl,
        method: "POST",
        encoding: "multipart/form-data",
        fileField: uploadFieldName,
        maxBytes: MAX_ARTIFACT_BYTES,
        note: `POST the whole revised file as multipart/form-data, the bytes in a field named "${uploadFieldName}", up to ${MAX_MEGABYTES}MB. Nothing else goes in the body -- the editToken is already in this URL. The link people already have serves the new revision as soon as this finishes.`,
      },
      null,
      2,
    ),
  );
}

export const getUploadLinkTool: McpTool = {
  name: "coedit_get_upload_link",
  title: "Get a direct upload link for a large artifact",
  description: DESCRIPTION,
  inputSchema: INPUT_SCHEMA,
  run,
};
