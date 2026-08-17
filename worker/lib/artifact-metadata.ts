import { z } from "zod";
import { artifactMetadataKey } from "./storage-keys";

export const artifactMetadataSchema = z.object({
  fileName: z.string().min(1),
  size: z.number().int().positive(),
  uploadedAt: z.string().datetime(),
  revision: z.string().min(1),
  previousRevisions: z.array(z.string().min(1)).default([]),
  // Revision name to full content digest, for revisions stored in the blob
  // space. Dedup applies to new uploads only -- decided rather than drifted
  // into, and this map is where the decision lives: a revision listed here is
  // read from `blobs/`, and one that is not is read from the old per-artifact
  // key it was written to. There is no migration and no second layout to
  // document, only a lookup that says which of the two an artifact uses.
  blobs: z.record(z.string(), z.string()).default({}),
  // When the artifact was last served, rounded down to an hour, and how many
  // of those views were not the uploader checking their own link. Both are
  // read only to decide which side of an expiry line a file falls on, so a
  // lost increment costs a sweep that arrives a little later than it could.
  lastViewedAt: z.string().optional(),
  meaningfulViews: z.number().int().nonnegative().default(0),
  // Set when the artifact is inside the warning window, so the owner's own
  // file list can say so before the sweep rather than after it.
  expiresAt: z.string().optional(),
  passwordHash: z.string().optional(),
  ownerId: z.string().optional(),
  published: z.boolean().default(true),
  tokens: z
    .object({
      viewToken: z.string().optional(),
      suggestToken: z.string().optional(),
      editToken: z.string().optional(),
    })
    .optional(),
});

export type ArtifactMetadata = z.infer<typeof artifactMetadataSchema>;
export type ArtifactMetadataInput = z.input<typeof artifactMetadataSchema>;

export function withNewRevision(
  metadata: ArtifactMetadata,
  uploaded: { fileName: string; size: number; revision: string },
): ArtifactMetadata {
  return {
    ...metadata,
    ...uploaded,
    uploadedAt: new Date().toISOString(),
    previousRevisions: [...metadata.previousRevisions, metadata.revision],
  };
}

export type PutMetadataResult = { ok: true } | { ok: false; cause: unknown };

export async function putArtifactMetadata(
  kv: KVNamespace,
  artifactId: string,
  metadata: ArtifactMetadataInput,
  options: { expirationTtl?: number } = {},
): Promise<PutMetadataResult> {
  try {
    await kv.put(
      artifactMetadataKey(artifactId),
      JSON.stringify(metadata),
      options,
    );
    return { ok: true };
  } catch (cause) {
    return { ok: false, cause };
  }
}

export type GetMetadataResult =
  | { ok: true; metadata: ArtifactMetadata | null }
  | { ok: false; cause: unknown };

export async function getArtifactMetadata(
  kv: KVNamespace,
  artifactId: string,
): Promise<GetMetadataResult> {
  try {
    const raw = await kv.get(artifactMetadataKey(artifactId));
    if (raw === null) {
      return { ok: true, metadata: null };
    }
    const parsed = artifactMetadataSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return { ok: false, cause: parsed.error };
    }
    return { ok: true, metadata: parsed.data };
  } catch (cause) {
    return { ok: false, cause };
  }
}

export type DeleteMetadataResult = { ok: true } | { ok: false; cause: unknown };

export async function deleteArtifactMetadata(
  kv: KVNamespace,
  artifactId: string,
): Promise<DeleteMetadataResult> {
  try {
    await kv.delete(artifactMetadataKey(artifactId));
    return { ok: true };
  } catch (cause) {
    return { ok: false, cause };
  }
}
