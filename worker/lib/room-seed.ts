import type { OverlayEntry } from "@coedithtml/protocol";
import type { WorkerEnv } from "@/lib/env";
import {
  ROOM_OVERLAY_PATH,
  ROOM_SEED_PATH,
  ROOM_WIPE_PATH,
} from "@/lib/room-headers";

// Deleting an artifact left its room standing: the comments, the stickies, and
// the edits all survived a document nobody could reach any more.
export async function wipeRoom(
  env: WorkerEnv,
  artifactId: string,
): Promise<void> {
  const room = env.DOC_ROOM.get(env.DOC_ROOM.idFromName(artifactId));
  try {
    await room.fetch(new Request(`https://room.invalid${ROOM_WIPE_PATH}`));
  } catch (cause) {
    console.error("Failed to reach the room to wipe it", cause);
  }
}

// Asked only about the handful of artifacts the sweep is already minded to
// take, never about all of them.
export async function roomIsEmpty(
  env: WorkerEnv,
  artifactId: string,
): Promise<boolean> {
  const room = env.DOC_ROOM.get(env.DOC_ROOM.idFromName(artifactId));
  try {
    const response = await room.fetch(
      new Request(`https://room.invalid${ROOM_OVERLAY_PATH}`),
    );
    if (!response.ok) {
      return false;
    }
    const overlay = (await response.json()) as { entries?: unknown[] };
    return (overlay.entries ?? []).length === 0;
  } catch (cause) {
    console.error("Failed to ask the room what it holds", cause);
    return false;
  }
}

export async function seedRoomWithEntries(
  env: WorkerEnv,
  artifactId: string,
  entries: OverlayEntry[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }
  const room = env.DOC_ROOM.get(env.DOC_ROOM.idFromName(artifactId));
  const seeded = await room
    .fetch(
      new Request(`https://room.invalid${ROOM_SEED_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(entries),
      }),
    )
    .catch((cause: unknown) => {
      console.error("Failed to reach the room to seed it", cause);
      return null;
    });
  if (seeded !== null && !seeded.ok) {
    console.error(`Room refused its seed entries with ${seeded.status}`);
  }
}
