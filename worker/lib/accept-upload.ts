import { putArtifact } from "@/lib/artifact-store";
import { readBodyWithinLimit } from "@/lib/capped-body";
import type { WorkerEnv } from "@/lib/env";
import { checkHtmlDocument, describeRejection } from "@/lib/html-document";
import { isWithinRateLimit, recordRateLimitedAttempt } from "@/lib/rate-limit";
import { clientIpOf } from "@/lib/request-ip";
import { jsonError, SAVE_FAILED } from "@/lib/responses";
import {
  MAX_UPLOAD_BODY_BYTES,
  uploadFieldName,
  uploadedArtifactSchema,
} from "@/lib/schemas/artifact";

export const BAD_FORM = "Upload a single .html file as form data.";
export const TOO_LARGE = "The file is larger than 5MB.";

const UPLOAD_LIMIT = 20;
const UPLOAD_WINDOW_SECONDS = 3600;

export type AcceptedUpload = {
  fileName: string;
  bytes: ArrayBuffer;
  password: string | null;
};

export type Rejected = { ok: false; response: Response };

type ParsedForm = { files: File[]; password: string | null };

type ReadFormResult =
  { ok: true; form: ParsedForm } | { ok: false; status: 400 | 413 };

async function parseFormBytes(
  request: Request,
  bytes: Uint8Array,
): Promise<ParsedForm | null> {
  try {
    const form = await new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: bytes as BodyInit,
    }).formData();
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

async function readForm(request: Request): Promise<ReadFormResult> {
  const capped = await readBodyWithinLimit(request, MAX_UPLOAD_BODY_BYTES);
  if (!capped.ok) {
    return { ok: false, status: capped.reason === "too-large" ? 413 : 400 };
  }

  const parsed = await parseFormBytes(request, capped.bytes);
  return parsed === null
    ? { ok: false, status: 400 }
    : { ok: true, form: parsed };
}

export function declaredBodyTooLarge(request: Request): boolean {
  const declaredBytes = Number(request.headers.get("content-length"));
  return (
    Number.isFinite(declaredBytes) && declaredBytes > MAX_UPLOAD_BODY_BYTES
  );
}

export async function chargeUploadAttempt(
  request: Request,
  env: WorkerEnv,
): Promise<Response | null> {
  const uploadKey = `upload-attempts:${clientIpOf(request)}`;
  const rateLimit = await isWithinRateLimit(
    env.ARTIFACT_METADATA,
    uploadKey,
    UPLOAD_LIMIT,
  );
  if (!rateLimit.ok) {
    console.error("Failed to check the upload rate limit", rateLimit.cause);
    return jsonError(SAVE_FAILED, 500);
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
    return jsonError(SAVE_FAILED, 500);
  }
  return null;
}

export async function acceptUpload(
  request: Request,
): Promise<{ ok: true; upload: AcceptedUpload } | Rejected> {
  const read = await readForm(request);
  if (!read.ok) {
    return {
      ok: false,
      response:
        read.status === 413
          ? jsonError(TOO_LARGE, 413)
          : jsonError(BAD_FORM, 400),
    };
  }

  const { files, password } = read.form;
  const file = files[0];
  if (files.length !== 1 || !file) {
    return {
      ok: false,
      response: jsonError(
        files.length > 1 ? "Upload one file, not several." : BAD_FORM,
        400,
      ),
    };
  }

  const parsed = uploadedArtifactSchema.safeParse({
    fileName: file.name,
    size: file.size,
  });
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(parsed.error.issues[0]?.message ?? BAD_FORM, 400),
    };
  }

  const bytes = await file.arrayBuffer();
  const document = checkHtmlDocument(new TextDecoder().decode(bytes));
  if (!document.ok) {
    return {
      ok: false,
      response: jsonError(describeRejection(document.reason), 415),
    };
  }

  return { ok: true, upload: { fileName: file.name, bytes, password } };
}

export async function storeRevision(
  env: WorkerEnv,
  artifactId: string,
  revision: string,
  bytes: ArrayBuffer,
): Promise<Response | null> {
  const stored = await putArtifact(
    env.ARTIFACT_STORE,
    artifactId,
    revision,
    bytes,
  );
  if (!stored.ok) {
    console.error("Failed to store artifact", stored.cause);
    return jsonError(SAVE_FAILED, 500);
  }
  return null;
}
