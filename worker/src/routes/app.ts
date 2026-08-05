import { serveAppAsset } from "@/lib/app-assets";
import type { WorkerEnv } from "@/lib/env";
import { jsonError } from "@/lib/responses";
import { handleGetArtifact } from "./artifact";
import { handleRevokeToken } from "./revoke";
import { handleRoomConnect } from "./room";
import { handleUnlockArtifact } from "./unlock";
import { handleUpload } from "./upload";

const ARTIFACT_TOKEN_PATH = /^\/api\/artifacts\/([^/]+)$/;
const ARTIFACT_UNLOCK_PATH = /^\/api\/artifacts\/([^/]+)\/unlock$/;
const ARTIFACT_ROOM_PATH = /^\/api\/artifacts\/([^/]+)\/room$/;
const READ_METHODS = new Set(["GET", "HEAD"]);

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

  const unlockMatch = ARTIFACT_UNLOCK_PATH.exec(pathname);
  if (unlockMatch) {
    if (request.method !== "POST") {
      return jsonError("Method not allowed.", 405);
    }
    return handleUnlockArtifact(unlockMatch[1] ?? "", request, env);
  }

  const roomMatch = ARTIFACT_ROOM_PATH.exec(pathname);
  if (roomMatch) {
    if (request.method !== "GET") {
      return jsonError("Method not allowed.", 405);
    }
    return handleRoomConnect(roomMatch[1] ?? "", request, env);
  }

  const tokenMatch = ARTIFACT_TOKEN_PATH.exec(pathname);
  if (tokenMatch) {
    const token = tokenMatch[1] ?? "";
    if (request.method === "GET") {
      return handleGetArtifact(token, request, env);
    }
    if (request.method === "DELETE") {
      return handleRevokeToken(token, env);
    }
    return jsonError("Method not allowed.", 405);
  }

  if (pathname.startsWith("/api/")) {
    return jsonError("Not found.", 404);
  }

  if (!READ_METHODS.has(request.method)) {
    return new Response("Method not allowed", { status: 405 });
  }
  return serveAppAsset(request, env);
}
