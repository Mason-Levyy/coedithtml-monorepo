import type { WorkerEnv } from "@/lib/env";
import { originFor } from "@/lib/origins";
import { checkPasswordGate } from "@/lib/password-gate";
import { resolveArtifactByToken } from "@/lib/resolve-artifact";
import { jsonError } from "@/lib/responses";
import { ROOM_REVISION_HEADER, ROOM_WRITE_HEADER } from "@/lib/room-headers";
import { UNLOCK_QUERY_PARAM } from "@/lib/share-links";

const UNAVAILABLE = "Could not open the comment room. Try again.";

function isFromAppOrigin(request: Request, env: WorkerEnv): boolean {
  const declared = request.headers.get("origin");
  return declared !== null && declared === originFor(request, env.APP_HOST);
}

export async function handleRoomConnect(
  token: string,
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  if (request.headers.get("upgrade") !== "websocket") {
    return jsonError("Expected a websocket upgrade.", 426);
  }
  if (!isFromAppOrigin(request, env)) {
    return jsonError("Not found.", 404);
  }

  const resolved = await resolveArtifactByToken(env.ARTIFACT_METADATA, token);
  if (!resolved.ok) {
    if (resolved.status === 500) {
      console.error(
        "Failed to resolve the artifact for its room",
        resolved.cause,
      );
      return jsonError(UNAVAILABLE, 500);
    }
    return jsonError("Not found.", 404);
  }

  const { artifactId, metadata, record } = resolved.artifact;
  const gate = await checkPasswordGate(env.ARTIFACT_METADATA, {
    artifactId,
    passwordHash: metadata.passwordHash,
    grant: new URL(request.url).searchParams.get(UNLOCK_QUERY_PARAM),
  });
  if (!gate.ok) {
    if (gate.status === 500) {
      console.error("Failed to check the password gate for a room", gate.cause);
      return jsonError(UNAVAILABLE, 500);
    }
    return jsonError("This link needs a password.", 401);
  }

  const room = env.DOC_ROOM.get(env.DOC_ROOM.idFromName(artifactId));
  return room.fetch(
    new Request(request.url, {
      headers: {
        upgrade: "websocket",
        [ROOM_WRITE_HEADER]: record.kind === "edit" ? "yes" : "no",
        [ROOM_REVISION_HEADER]: metadata.revision,
      },
    }),
  );
}
