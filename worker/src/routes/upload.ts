import { putAccessToken } from "@/lib/access-tokens";
import { putArtifactMetadata } from "@/lib/artifact-metadata";
import { putArtifact } from "@/lib/artifact-store";
import type { WorkerEnv } from "@/lib/env";
import { checkHtmlDocument, describeRejection } from "@/lib/html-document";
import { hashArtifactPassword } from "@/lib/password";
import { isWithinRateLimit, recordRateLimitedAttempt } from "@/lib/rate-limit";
import { clientIpOf } from "@/lib/request-ip";
import { jsonError, jsonResponse } from "@/lib/responses";
import { viewerUrl } from "@/lib/share-links";
import {
  MAX_ARTIFACT_BYTES,
  uploadFieldName,
  uploadedArtifactSchema,
} from "@/lib/schemas/artifact";
import { newArtifactId, newToken } from "@/lib/storage-keys";

const BAD_FORM = "Upload a single .html file as form data.";
const UPLOAD_LIMIT = 20;
const UPLOAD_WINDOW_SECONDS = 3600;

type ParsedForm = { files: File[]; password: string | null };

async function readForm(request: Request): Promise<ParsedForm | null> {
  try {
    const form = await request.formData();
    const files = form
      .getAll(uploadFieldName)
      .filter((part): part is File => part instanceof File);
    const passwordField = form.get("password");
    const password =
      typeof passwordField === "string" && passwordField.length > 0
        ? passwordField
        : null;
    return { files, password };
  } catch {
    return null;
  }
}

export async function handleUpload(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  const declaredBytes = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredBytes) && declaredBytes > MAX_ARTIFACT_BYTES) {
    return jsonError("The file is larger than 5MB.", 413);
  }

  const uploadKey = `upload-attempts:${clientIpOf(request)}`;
  const rateLimit = await isWithinRateLimit(
    env.ARTIFACT_METADATA,
    uploadKey,
    UPLOAD_LIMIT,
  );
  if (!rateLimit.ok) {
    console.error("Failed to check the upload rate limit", rateLimit.cause);
    return jsonError("Could not save the file. Try again.", 500);
  }
  if (!rateLimit.allowed) {
    return jsonError("Too many uploads. Try again later.", 429);
  }
  const recorded = await recordRateLimitedAttempt(
    env.ARTIFACT_METADATA,
    uploadKey,
    UPLOAD_WINDOW_SECONDS,
  );
  if (!recorded.ok) {
    console.error("Failed to record the upload attempt", recorded.cause);
    return jsonError("Could not save the file. Try again.", 500);
  }

  const form = await readForm(request);
  if (form === null) {
    return jsonError(BAD_FORM, 400);
  }
  const { files, password } = form;
  if (files.length !== 1) {
    return jsonError(
      files.length === 0 ? BAD_FORM : "Upload one file, not several.",
      400,
    );
  }

  const file = files[0];
  if (!file) {
    return jsonError(BAD_FORM, 400);
  }

  const parsed = uploadedArtifactSchema.safeParse({
    fileName: file.name,
    size: file.size,
  });
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? BAD_FORM, 400);
  }

  const bytes = await file.arrayBuffer();
  const document = checkHtmlDocument(new TextDecoder().decode(bytes));
  if (!document.ok) {
    return jsonError(describeRejection(document.reason), 415);
  }

  const artifactId = newArtifactId();
  const stored = await putArtifact(env.ARTIFACT_STORE, artifactId, bytes);
  if (!stored.ok) {
    console.error("Failed to store artifact", stored.cause);
    return jsonError("Could not save the file. Try again.", 500);
  }

  const passwordHash =
    password === null
      ? undefined
      : await hashArtifactPassword(artifactId, password);

  const storedMetadata = await putArtifactMetadata(
    env.ARTIFACT_METADATA,
    artifactId,
    {
      fileName: file.name,
      size: bytes.byteLength,
      uploadedAt: new Date().toISOString(),
      ...(passwordHash === undefined ? {} : { passwordHash }),
    },
  );
  if (!storedMetadata.ok) {
    console.error("Failed to store artifact metadata", storedMetadata.cause);
    return jsonError("Could not save the file. Try again.", 500);
  }

  const viewToken = newToken();
  const editToken = newToken();
  const tokenResults = await Promise.all([
    putAccessToken(env.ARTIFACT_METADATA, viewToken, {
      artifactId,
      kind: "view",
    }),
    putAccessToken(env.ARTIFACT_METADATA, editToken, {
      artifactId,
      kind: "edit",
    }),
  ]);
  const failedToken = tokenResults.find((result) => !result.ok);
  if (failedToken && !failedToken.ok) {
    console.error("Failed to store access tokens", failedToken.cause);
    return jsonError("Could not save the file. Try again.", 500);
  }

  return jsonResponse(
    {
      artifactId,
      viewToken,
      editToken,
      viewUrl: viewerUrl(request, env, viewToken),
      editUrl: viewerUrl(request, env, editToken),
    },
    201,
  );
}
