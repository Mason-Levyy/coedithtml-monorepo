import type { WorkerEnv } from "@/lib/env";
import { jsonError } from "@/lib/responses";
import { handleGetArtifact } from "./artifact";
import { handleUpload } from "./upload";

const ARTIFACT_TOKEN_PATH = /^\/api\/artifacts\/([^/]+)$/;

// Sandbox origin never reaches this router, so artifact scripts can't call the upload API.
export function handleAppRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response> | Response {
  const { pathname } = new URL(request.url);

  if (pathname === "/api/artifacts") {
    if (request.method !== "POST") {
      return jsonError("Method not allowed.", 405);
    }
    return handleUpload(request, env);
  }

  const tokenMatch = ARTIFACT_TOKEN_PATH.exec(pathname);
  if (tokenMatch) {
    const token = tokenMatch[1];
    if (request.method !== "GET") {
      return jsonError("Method not allowed.", 405);
    }
    return handleGetArtifact(token ?? "", request, env);
  }

  return new Response("Coedit app origin", { status: 200 });
}
