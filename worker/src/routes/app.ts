import type { WorkerEnv } from "@/lib/env";
import { jsonError } from "@/lib/responses";
import { handleUpload } from "./upload";

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

  return new Response("Coedit app origin", { status: 200 });
}
