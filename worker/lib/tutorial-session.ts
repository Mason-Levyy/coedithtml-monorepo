import { storeRevision } from "@/lib/accept-upload";
import { putArtifactMetadata } from "@/lib/artifact-metadata";
import { revisionOf } from "@/lib/content-hash";
import type { WorkerEnv } from "@/lib/env";
import { ROOM_SEED_PATH } from "@/lib/room-headers";
import { mintShareTokens } from "@/lib/share-tokens";
import { newArtifactId } from "@/lib/storage-keys";
import { readTutorialDeck, TUTORIAL_FILE_NAME } from "@/lib/tutorial-deck";
import { tutorialEntries } from "@/lib/tutorial-seed";

export const TUTORIAL_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

export type TutorialSession =
  { ok: true; editToken: string } | { ok: false; reason: "unavailable" };

const UNAVAILABLE: TutorialSession = { ok: false, reason: "unavailable" };

async function seedRoom(
  env: WorkerEnv,
  artifactId: string,
  revision: string,
): Promise<void> {
  const room = env.DOC_ROOM.get(env.DOC_ROOM.idFromName(artifactId));
  const seeded = await room
    .fetch(
      new Request(`https://room.invalid${ROOM_SEED_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(tutorialEntries({ revision, now: new Date() })),
      }),
    )
    .catch((cause: unknown) => {
      console.error("Failed to reach the tutorial room", cause);
      return null;
    });
  if (seeded !== null && !seeded.ok) {
    console.error(`Tutorial room refused its notes with ${seeded.status}`);
  }
}

async function storeDeck(
  request: Request,
  env: WorkerEnv,
  artifactId: string,
): Promise<{ revision: string } | null> {
  const bytes = await readTutorialDeck(request, env);
  if (bytes === null) {
    return null;
  }
  const revision = await revisionOf(bytes);
  const failedToStore = await storeRevision(env, artifactId, revision, bytes);
  if (failedToStore) {
    return null;
  }

  const storedMetadata = await putArtifactMetadata(
    env.ARTIFACT_METADATA,
    artifactId,
    {
      fileName: TUTORIAL_FILE_NAME,
      size: bytes.byteLength,
      uploadedAt: new Date().toISOString(),
      revision,
      previousRevisions: [],
    },
    { expirationTtl: TUTORIAL_LIFETIME_SECONDS },
  );
  if (!storedMetadata.ok) {
    console.error("Failed to store tutorial metadata", storedMetadata.cause);
    return null;
  }
  return { revision };
}

export async function startTutorialSession(
  request: Request,
  env: WorkerEnv,
): Promise<TutorialSession> {
  const artifactId = newArtifactId();
  const stored = await storeDeck(request, env, artifactId);
  if (stored === null) {
    return UNAVAILABLE;
  }

  const minted = await mintShareTokens(env, artifactId, {
    expirationTtl: TUTORIAL_LIFETIME_SECONDS,
  });
  if (!minted.ok) {
    return UNAVAILABLE;
  }

  await seedRoom(env, artifactId, stored.revision);
  return { ok: true, editToken: minted.tokens.editToken };
}
