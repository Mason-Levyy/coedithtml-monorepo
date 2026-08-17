import { wantsMarkdown } from "@/lib/agent-markdown";
import { serveAppAsset } from "@/lib/app-assets";
import type { WorkerEnv } from "@/lib/env";
import { isCrossOriginWrite } from "@/lib/request-origin";
import { jsonError } from "@/lib/responses";
import type { TokenKind } from "@/lib/room-capabilities";
import { handleGetArtifact } from "./artifact";
import {
  handleDeleteArtifact,
  handleUpdateArtifactSettings,
} from "./artifact-settings";
import {
  handleAgentCard,
  handleApiCatalog,
  handleAppHomeMarkdown,
  handleAuthMd,
  handleHealth,
  handleOAuthAuthorizationServer,
  handleOAuthProtectedResource,
  handleTutorialMarkdown,
} from "./discovery";
import { handleListMyArtifacts } from "./my-artifacts";
import { handlePublishArtifact } from "./publish";
import { handleRegenerateLink } from "./regenerate-link";
import { handleReplaceArtifact } from "./revisions";
import { handleRevokeToken } from "./revoke";
import { handleRoomConnect } from "./room";
import { handleStartTutorial } from "./tutorial";
import { handleUnlockArtifact } from "./unlock";
import { handleUpload } from "./upload";

const TUTORIAL_PATH = "/tutorial";
const MY_ARTIFACTS_PATH = "/api/my-artifacts";
const MY_ARTIFACT_PATH = /^\/api\/my-artifacts\/([^/]+)$/;
const ARTIFACT_TOKEN_PATH = /^\/api\/artifacts\/([^/]+)$/;
const ARTIFACT_PUBLISH_PATH = /^\/api\/artifacts\/([^/]+)\/publish$/;
const ARTIFACT_SETTINGS_PATH = /^\/api\/artifacts\/([^/]+)\/settings$/;
const ARTIFACT_UNLOCK_PATH = /^\/api\/artifacts\/([^/]+)\/unlock$/;
const ARTIFACT_ROOM_PATH = /^\/api\/artifacts\/([^/]+)\/room$/;
const ARTIFACT_REVISIONS_PATH = /^\/api\/artifacts\/([^/]+)\/revisions$/;
const ARTIFACT_LINK_REGENERATE_PATH =
  /^\/api\/artifacts\/([^/]+)\/links\/(view|suggest|edit)\/regenerate$/;
const READ_METHODS = new Set(["GET", "HEAD"]);

const DISCOVERY_ROUTES: Record<
  string,
  (req: Request, env: WorkerEnv) => Response
> = {
  "/.well-known/api-catalog": (req, env) => handleApiCatalog(req, env),
  "/.well-known/agent-card.json": (req, env) => handleAgentCard(req, env),
  "/.well-known/oauth-protected-resource": (req, env) =>
    handleOAuthProtectedResource(req, env),
  "/.well-known/oauth-authorization-server": (req, env) =>
    handleOAuthAuthorizationServer(req, env),
  "/auth.md": () => handleAuthMd(),
  "/api/health": () => handleHealth(),
};

export async function handleAppRequest(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const { pathname } = new URL(request.url);

  const discoveryHandler = DISCOVERY_ROUTES[pathname];
  if (discoveryHandler) {
    return request.method === "GET"
      ? discoveryHandler(request, env)
      : new Response("Method not allowed", { status: 405 });
  }

  if (!pathname.startsWith("/api/")) {
    if (pathname === "/" || pathname === "") {
      if (request.method === "GET" && wantsMarkdown(request)) {
        return handleAppHomeMarkdown();
      }
    }
    if (pathname === TUTORIAL_PATH || pathname === `${TUTORIAL_PATH}/`) {
      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405 });
      }
      return wantsMarkdown(request)
        ? handleTutorialMarkdown()
        : handleStartTutorial(request, env);
    }
    if (!READ_METHODS.has(request.method)) {
      return new Response("Method not allowed", { status: 405 });
    }
    return serveAppAsset(request, env);
  }

  if (!READ_METHODS.has(request.method) && isCrossOriginWrite(request, env)) {
    return jsonError("This request did not come from the app.", 403);
  }

  if (pathname === "/api/artifacts") {
    if (request.method !== "POST") {
      return jsonError("Method not allowed.", 405);
    }
    return handleUpload(request, env);
  }

  if (pathname === MY_ARTIFACTS_PATH) {
    if (request.method !== "GET") {
      return jsonError("Method not allowed.", 405);
    }
    return handleListMyArtifacts(request, env);
  }

  const myArtifactMatch = MY_ARTIFACT_PATH.exec(pathname);
  if (myArtifactMatch) {
    if (request.method !== "DELETE") {
      return jsonError("Method not allowed.", 405);
    }
    return handleDeleteArtifact(myArtifactMatch[1] ?? "", request, env);
  }

  const publishMatch = ARTIFACT_PUBLISH_PATH.exec(pathname);
  if (publishMatch) {
    if (request.method !== "POST") {
      return jsonError("Method not allowed.", 405);
    }
    return handlePublishArtifact(publishMatch[1] ?? "", request, env);
  }

  const settingsMatch = ARTIFACT_SETTINGS_PATH.exec(pathname);
  if (settingsMatch) {
    if (request.method !== "PATCH") {
      return jsonError("Method not allowed.", 405);
    }
    return handleUpdateArtifactSettings(settingsMatch[1] ?? "", request, env);
  }

  const unlockMatch = ARTIFACT_UNLOCK_PATH.exec(pathname);
  if (unlockMatch) {
    if (request.method !== "POST") {
      return jsonError("Method not allowed.", 405);
    }
    return handleUnlockArtifact(unlockMatch[1] ?? "", request, env);
  }

  const linkRegenerateMatch = ARTIFACT_LINK_REGENERATE_PATH.exec(pathname);
  if (linkRegenerateMatch) {
    if (request.method !== "POST") {
      return jsonError("Method not allowed.", 405);
    }
    const kind = linkRegenerateMatch[2] as TokenKind;
    return handleRegenerateLink(
      linkRegenerateMatch[1] ?? "",
      kind,
      request,
      env,
    );
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
      return handleRevokeToken(token, request, env);
    }
    return jsonError("Method not allowed.", 405);
  }

  return jsonError("Not found.", 404);
}
