import {
  putArtifactMetadata,
  type ArtifactMetadata,
} from "@/lib/artifact-metadata";
import { isMeaningfulView, shouldRecordView } from "@/lib/expiry";

// Recording a view must never be able to fail a read. The artifact is already
// on its way to the reader by the time this runs, and a document that would not
// load because we could not write down that it loaded is the wrong trade
// entirely -- so this is best effort, awaited nowhere the reader is waiting.
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
