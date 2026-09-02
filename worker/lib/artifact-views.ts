import {
  putArtifactMetadata,
  type ArtifactMetadata,
} from "@/lib/artifact-metadata";
import { isMeaningfulView, shouldRecordView } from "@/lib/expiry";

export async function recordArtifactView(
  kv: KVNamespace,
  artifactId: string,
  metadata: ArtifactMetadata,
  viewedAt: number = Date.now(),
): Promise<void> {
  if (!shouldRecordView(metadata, viewedAt)) {
    return;
  }
  const seen = new Date(viewedAt).toISOString();
  const stored = await putArtifactMetadata(kv, artifactId, {
    ...metadata,
    lastViewedAt: seen,
    meaningfulViews:
      metadata.meaningfulViews + (isMeaningfulView(metadata, viewedAt) ? 1 : 0),
  });
  if (!stored.ok) {
    console.error("Failed to record an artifact view", stored.cause);
  }
}
