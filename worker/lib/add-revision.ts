import type { AcceptedUpload } from "@/lib/accept-upload";
import { storeRevision } from "@/lib/accept-upload";
import { withNewRevision, putArtifactMetadata } from "@/lib/artifact-metadata";
import { revisionOf } from "@/lib/content-hash";
import type { WorkerEnv } from "@/lib/env";
import { jsonError, SAVE_FAILED } from "@/lib/responses";
import type { ResolvedArtifact } from "@/lib/resolve-artifact";

export type AddedRevision =
  | { ok: true; revision: string; replaced: boolean }
  | { ok: false; response: Response };

export async function addRevision(
  env: WorkerEnv,
  artifact: ResolvedArtifact,
  upload: AcceptedUpload,
): Promise<AddedRevision> {
  const { artifactId, metadata } = artifact;
  const revision = await revisionOf(upload.bytes);
  if (revision === metadata.revision) {
    return { ok: true, revision, replaced: false };
  }

  const failedToStore = await storeRevision(
    env,
    artifactId,
    revision,
    upload.bytes,
  );
  if (failedToStore) {
    return { ok: false, response: failedToStore };
  }

  const stored = await putArtifactMetadata(
    env.ARTIFACT_METADATA,
    artifactId,
    withNewRevision(metadata, {
      fileName: upload.fileName,
      size: upload.bytes.byteLength,
      revision,
    }),
  );
  if (!stored.ok) {
    console.error("Failed to store artifact metadata", stored.cause);
    return { ok: false, response: jsonError(SAVE_FAILED, 500) };
  }

  return { ok: true, revision, replaced: true };
}
