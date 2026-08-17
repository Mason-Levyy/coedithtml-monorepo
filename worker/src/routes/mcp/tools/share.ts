import { z } from "zod";
import type { WorkerEnv } from "@/lib/env";
import { TOKEN_KINDS, type TokenKind } from "@/lib/room-capabilities";
import { MCP_MAX_ARTIFACT_BYTES, chargeMcpUpload } from "../ceilings";
import { callApp, jsonOf } from "../dispatch";
import {
  errorResult,
  textResult,
  type McpTool,
  type ToolResult,
} from "../tool";
import { resolveWorkspace } from "../workspace-key";

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

function bodyFor(html: string, fileName: string, password?: string): FormData {
  const form = new FormData();
  form.append("file", new File([html], fileName, { type: "text/html" }));
  if (password !== undefined && password.length > 0) {
    form.append("password", password);
  }
  return form;
}

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

  if (new TextEncoder().encode(html).byteLength > MCP_MAX_ARTIFACT_BYTES) {
    return errorResult(
      "That file is over 1MB, which is more than this connector will carry. Large inlined images are usually the cause; link them instead and share it again.",
    );
  }

  const secret = context.env.MCP_SIGNING_SECRET;
  if (secret === undefined) {
    console.error("MCP_SIGNING_SECRET is not set");
    return errorResult("Coedit is not configured to accept this yet.");
  }

  const refused = await chargeMcpUpload(context.request, context.env);
  if (refused !== null) {
    return errorResult(refused);
  }

  const workspace = await resolveWorkspace(workspaceKey, secret);
  const uploaded = await callApp(context.env, {
    path: "/api/artifacts",
    method: "POST",
    ownerId: workspace.ownerId,
    rateLimitKey: workspace.workspaceKey,
    body: bodyFor(html, fileName, password),
  });

  const body = jsonOf(uploaded);
  if (uploaded.status !== 201 || body === null) {
    const reason = body?.error;
    return errorResult(
      typeof reason === "string"
        ? reason
        : "Coedit would not accept that file. It must be one complete HTML document that runs without a build step.",
    );
  }

  return textResult(
    JSON.stringify(
      {
        shareUrl: body[URL_FIELD[permission]],
        permission,
        editToken: body.editToken,
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
