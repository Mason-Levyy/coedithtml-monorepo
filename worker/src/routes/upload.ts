import { putArtifact } from "@/lib/artifact-store";
import type { WorkerEnv } from "@/lib/env";
import { checkHtmlDocument, describeRejection } from "@/lib/html-document";
import { jsonError, jsonResponse } from "@/lib/responses";
import {
  MAX_ARTIFACT_BYTES,
  uploadFieldName,
  uploadedArtifactSchema,
} from "@/lib/schemas/artifact";
import { newArtifactId } from "@/lib/storage-keys";

const BAD_FORM = "Upload a single .html file as form data.";

async function readFiles(request: Request): Promise<File[] | null> {
  try {
    const form = await request.formData();
    return form.getAll(uploadFieldName).filter((part) => part instanceof File);
  } catch {
    // A malformed or truncated multipart body is a client error, not ours.
    return null;
  }
}

export async function handleUpload(
  request: Request,
  env: WorkerEnv,
): Promise<Response> {
  // Checked before the body is read so an oversized upload is refused without
  // ever being buffered.
  const declaredBytes = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredBytes) && declaredBytes > MAX_ARTIFACT_BYTES) {
    return jsonError("The file is larger than 5MB.", 413);
  }

  const files = await readFiles(request);
  if (files === null) {
    return jsonError(BAD_FORM, 400);
  }
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

  return jsonResponse({ artifactId }, 201);
}
