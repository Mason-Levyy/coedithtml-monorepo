import type { WorkerEnv } from "@/lib/env";
import { MCP_MAX_ARTIFACT_BYTES, chargeMcpUpload } from "../ceilings";
import { callApp, jsonOf } from "../dispatch";

const encoder = new TextEncoder();

const MAX_MEGABYTES = Math.round(MCP_MAX_ARTIFACT_BYTES / (1024 * 1024));

const TOO_LARGE = `That file is over ${MAX_MEGABYTES}MB, which is more than this connector will carry. Large inlined images are usually the cause; link them instead and send it again.`;

export type PostedArtifact =
  { ok: true; body: Record<string, unknown> } | { ok: false; message: string };

export async function postArtifact(
  artifact: {
    html: string;
    fileName: string;
    path: string;
    rateLimitKey: string;
    ownerId?: string;
    password?: string;
    expect: number;
    refusal: string;
  },
  context: { request: Request; env: WorkerEnv },
): Promise<PostedArtifact> {
  if (encoder.encode(artifact.html).byteLength > MCP_MAX_ARTIFACT_BYTES) {
    return { ok: false, message: TOO_LARGE };
  }

  const refused = await chargeMcpUpload(context.request, context.env);
  if (refused !== null) {
    return { ok: false, message: refused };
  }

  const form = new FormData();
  form.append(
    "file",
    new File([artifact.html], artifact.fileName, { type: "text/html" }),
  );
  if (artifact.password !== undefined && artifact.password.length > 0) {
    form.append("password", artifact.password);
  }

  const posted = await callApp(context.env, {
    path: artifact.path,
    method: "POST",
    rateLimitKey: artifact.rateLimitKey,
    ...(artifact.ownerId === undefined ? {} : { ownerId: artifact.ownerId }),
    body: form,
  });

  const body = jsonOf(posted);
  if (posted.status !== artifact.expect || body === null) {
    const reason = body?.error;
    return {
      ok: false,
      message: typeof reason === "string" ? reason : artifact.refusal,
    };
  }
  return { ok: true, body };
}
