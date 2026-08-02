import type { WorkerEnv } from "@/lib/env";
import { jsonError } from "@/lib/responses";
import { handleGetArtifact } from "./artifact";
import { handleUpload } from "./upload";

const ARTIFACT_PATH = /^\/api\/artifacts\/([^/]+)$/;

// Routing lives on the app origin only. The sandbox origin never reaches here,
// so an artifact's own scripts cannot call the upload API from inside an
// artifact frame.
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

  const artifactMatch = ARTIFACT_PATH.exec(pathname);
  if (artifactMatch) {
    const artifactId = artifactMatch[1];
    if (request.method !== "GET") {
      return jsonError("Method not allowed.", 405);
    }
    return handleGetArtifact(artifactId ?? "", env);
  }

  return new Response("Coedit app origin", { status: 200 });
}
