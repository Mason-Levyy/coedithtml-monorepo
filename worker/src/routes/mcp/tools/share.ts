import { z } from "zod";
import { createArtifact } from "@/lib/create-artifact";
import type { WorkerEnv } from "@/lib/env";
import { TOKEN_KINDS, type TokenKind } from "@/lib/room-capabilities";
import {
  errorResult,
  textResult,
  type McpTool,
  type ToolResult,
} from "../tool";
import { resolveWorkspace } from "../workspace-key";
import { acceptArtifact } from "./accept-artifact";

const argumentsSchema = z.object({
  html: z.string().min(1),
  fileName: z.string().min(1),
  permission: z.enum(TOKEN_KINDS).default("suggest"),
  password: z.string().max(200).optional(),
  workspaceKey: z.string().optional(),
});

const URL_FIELD: Record<TokenKind, string> = {
  view: "viewUrl",
  suggest: "suggestUrl",
  edit: "editUrl",
};

const DESCRIPTION = `Put a single self-contained HTML file on Coedit and get a link other people can open, comment on, and edit in the browser. They need no account and no tools.

Send the whole file, exactly as it is. Coedit stores it byte for byte and never rewrites it.

Keep the editToken this returns for the rest of the conversation: it is how you read the feedback back with coedit_read_feedback and publish a new version with coedit_update_artifact. Give people the shareUrl, never the editToken.

Pass the workspaceKey back on later calls so this caller's files stay together.`;

const INPUT_SCHEMA = {
  type: "object",
  properties: {
    html: {
      type: "string",
      description: "The complete HTML document, including <html> and </html>.",
    },
    fileName: {
      type: "string",
      description: "A name ending in .html, for example q3-review.html.",
    },
    permission: {
      type: "string",
      enum: [...TOKEN_KINDS],
      description:
        "What the link lets people do: view, suggest (comment and leave notes), or edit (change the text directly). Defaults to suggest.",
    },
    password: {
      type: "string",
      description: "Optional. Anyone opening the link must type this first.",
    },
    workspaceKey: {
      type: "string",
      description:
        "The key a previous coedit_share_artifact call returned. Omit on the first call.",
    },
  },
  required: ["html", "fileName"],
} as const;

async function run(
  args: Record<string, unknown>,
  context: { request: Request; env: WorkerEnv },
): Promise<ToolResult> {
  const parsed = argumentsSchema.safeParse(args);
  if (!parsed.success) {
    return errorResult(
      "That call is missing the file. Send html and fileName, where fileName ends in .html.",
    );
  }
  const { html, fileName, permission, password, workspaceKey } = parsed.data;

  const secret = context.env.MCP_SIGNING_SECRET;
  if (secret === undefined) {
    console.error("MCP_SIGNING_SECRET is not set");
    return errorResult("Coedit is not configured to accept this yet.");
  }

  const accepted = await acceptArtifact(
    { html, fileName, ...(password === undefined ? {} : { password }) },
    context,
  );
  if (!accepted.ok) {
    return errorResult(accepted.message);
  }

  const workspace = await resolveWorkspace(workspaceKey, secret);
  const created = await createArtifact({
    env: context.env,
    upload: accepted.upload,
    ownerId: workspace.ownerId,
  });
  if (!created.ok) {
    return errorResult(
      "Coedit could not store that file. It may be holding as much as it can right now.",
    );
  }

  return textResult(
    JSON.stringify(
      {
        shareUrl: created.body[URL_FIELD[permission]],
        permission,
        editToken: created.body.editToken,
        workspaceKey: workspace.workspaceKey,
        note: "Send people the shareUrl. Keep the editToken and workspaceKey in this conversation; they are not for sharing.",
      },
      null,
      2,
    ),
  );
}

export const shareArtifactTool: McpTool = {
  name: "coedit_share_artifact",
  title: "Share an artifact on Coedit",
  description: DESCRIPTION,
  inputSchema: INPUT_SCHEMA,
  run,
};
