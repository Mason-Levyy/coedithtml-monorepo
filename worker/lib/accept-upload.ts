import { putArtifact } from "@/lib/artifact-store";
import { readBodyWithinLimit } from "@/lib/capped-body";
import type { WorkerEnv } from "@/lib/env";
import { checkHtmlDocument } from "@/lib/html-document";
import { chargeAttempt } from "@/lib/rate-limit";
import { clientIpOf } from "@/lib/request-ip";
import { jsonError, SAVE_FAILED } from "@/lib/responses";
import {
  MAX_ARTIFACT_BYTES,
  MAX_UPLOAD_BODY_BYTES,
  uploadFieldName,
} from "@/lib/schemas/artifact";
import { rejectionResponse } from "@/lib/upload-rejection";

const UPLOAD_LIMIT = 20;
const UPLOAD_WINDOW_SECONDS = 3600;

export type AcceptedUpload = {
  fileName: string;
  bytes: ArrayBuffer;
  password: string | null;
  draft: boolean;
};

export type Rejected = { ok: false; response: Response };

type ParsedForm = {
  files: File[];
  password: string | null;
  draft: boolean;
};

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
    const draftField = form.get("draft");
    const draft = draftField === "true" || draftField === "1";
    return { files, password, draft };
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
  const charged = await chargeAttempt(
    env.RATE_LIMITER,
    `upload-attempts:${clientIpOf(request)}`,
    { limit: UPLOAD_LIMIT, windowSeconds: UPLOAD_WINDOW_SECONDS },
  );
  if (!charged.ok) {
    console.error("Failed to charge the upload attempt", charged.cause);
    return jsonError(SAVE_FAILED, 500);
  }
  if (!charged.allowed) {
    return jsonError("Too many uploads. Try again later.", 429);
  }
  return null;
}

export async function acceptUpload(
  request: Request,
): Promise<{ ok: true; upload: AcceptedUpload } | Rejected> {
  const read = await readForm(request);
  if (!read.ok) {
    return read.status === 413
      ? { ok: false, response: rejectionResponse("too-large", 413) }
      : { ok: false, response: rejectionResponse("not-form", 400) };
  }

  const { files, password, draft } = read.form;
  const file = files[0];
  if (files.length > 1) {
    return { ok: false, response: rejectionResponse("several-files", 400) };
  }
  if (!file) {
    return { ok: false, response: rejectionResponse("not-form", 400) };
  }
  if (!/\.html?$/i.test(file.name)) {
    return { ok: false, response: rejectionResponse("wrong-extension", 400) };
  }
  if (file.size === 0) {
    return { ok: false, response: rejectionResponse("empty-file", 400) };
  }
  if (file.size > MAX_ARTIFACT_BYTES) {
    return { ok: false, response: rejectionResponse("too-large", 413) };
  }

  const bytes = await file.arrayBuffer();
  const document = checkHtmlDocument(new TextDecoder().decode(bytes));
  if (!document.ok) {
    return { ok: false, response: rejectionResponse(document.reason, 415) };
  }

  return { ok: true, upload: { fileName: file.name, bytes, password, draft } };
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
