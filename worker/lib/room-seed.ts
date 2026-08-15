import type { OverlayEntry } from "@coedithtml/protocol";
import type { WorkerEnv } from "@/lib/env";
import { ROOM_SEED_PATH } from "@/lib/room-headers";

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
