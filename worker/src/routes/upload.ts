import {
  acceptUpload,
  chargeUploadAttempt,
  declaredBodyTooLarge,
} from "@/lib/accept-upload";
import { createArtifact } from "@/lib/create-artifact";
import type { WorkerEnv } from "@/lib/env";
import { resolveOwnerId, withOwnerCookie } from "@/lib/owner-cookie";
import { jsonResponse } from "@/lib/responses";
import { rejectionResponse } from "@/lib/upload-rejection";

export async function handleUpload(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  if (declaredBodyTooLarge(request)) {
    return rejectionResponse("too-large", 413);
  }

  const overLimit = await chargeUploadAttempt(request, env);
  if (overLimit) {
    return overLimit;
  }

  const accepted = await acceptUpload(request);
  if (!accepted.ok) {
    return accepted.response;
  }

  const { ownerId, isNew } = resolveOwnerId(request);

  const created = await createArtifact({
    env,
    request,
    upload: accepted.upload,
    ownerId,
  });
  if (!created.ok) {
    return created.response;
  }

  return withOwnerCookie(jsonResponse(created.body, 201), ownerId, isNew);
}
