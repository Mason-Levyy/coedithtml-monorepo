import { z } from "zod";
import { artifactMetadataKey } from "./storage-keys";

export const readingProfileSchema = z.enum(["slides", "pages", "app"]);

export const artifactMetadataSchema = z.object({
  fileName: z.string().min(1),
  size: z.number().int().positive(),
  uploadedAt: z.string().datetime(),
  passwordHash: z.string().optional(),
  // A property of the link, not of the reader: absent means "whatever the
  // runtime's cascade decides", and everyone opening the link sees the same
  // answer either way.
  profile: readingProfileSchema.optional(),
});

export type ArtifactMetadata = z.infer<typeof artifactMetadataSchema>;

export type PutMetadataResult = { ok: true } | { ok: false; cause: unknown };

export async function putArtifactMetadata(
  kv: KVNamespace,
  artifactId: string,
  metadata: ArtifactMetadata,
): Promise<PutMetadataResult> {
  try {
    await kv.put(artifactMetadataKey(artifactId), JSON.stringify(metadata));
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
