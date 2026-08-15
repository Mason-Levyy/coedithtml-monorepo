import { serveAppAsset } from "@/lib/app-assets";
import type { WorkerEnv } from "@/lib/env";
import { jsonError } from "@/lib/responses";
import { handleGetArtifact } from "./artifact";
import { handleReplaceArtifact } from "./revisions";
import { handleRevokeToken } from "./revoke";
import { handleRoomConnect } from "./room";
import { handleStartTutorial } from "./tutorial";
import { handleUnlockArtifact } from "./unlock";
import { handleUpload } from "./upload";

const TUTORIAL_PATH = "/tutorial";
const ARTIFACT_TOKEN_PATH = /^\/api\/artifacts\/([^/]+)$/;
const ARTIFACT_UNLOCK_PATH = /^\/api\/artifacts\/([^/]+)\/unlock$/;
const ARTIFACT_ROOM_PATH = /^\/api\/artifacts\/([^/]+)\/room$/;
const ARTIFACT_REVISIONS_PATH = /^\/api\/artifacts\/([^/]+)\/revisions$/;
const READ_METHODS = new Set(["GET", "HEAD"]);

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

  const revisionsMatch = ARTIFACT_REVISIONS_PATH.exec(pathname);
  if (revisionsMatch) {
    if (request.method !== "POST") {
      return jsonError("Method not allowed.", 405);
    }
    return handleReplaceArtifact(revisionsMatch[1] ?? "", request, env);
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

  if (pathname === TUTORIAL_PATH || pathname === `${TUTORIAL_PATH}/`) {
    return request.method === "GET"
      ? handleStartTutorial(request, env)
      : new Response("Method not allowed", { status: 405 });
  }

  if (!READ_METHODS.has(request.method)) {
    return new Response("Method not allowed", { status: 405 });
  }
  return serveAppAsset(request, env);
}
