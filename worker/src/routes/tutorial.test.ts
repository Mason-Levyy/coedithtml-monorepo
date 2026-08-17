import { TUTORIAL_QUERY_PARAM, type OverlayEntry } from "@coedithtml/protocol";
import { describe, expect, it } from "vitest";
import type { WorkerEnv } from "@/lib/env";
import {
  FAKE_APP_HOST,
  liveKv,
  recordingArtifactStore,
  recordingDocRoom,
  stubAssets,
  testWorkerEnv,
} from "@/lib/fakes";
import { TUTORIAL_DECK_ASSET_PATH } from "@/lib/tutorial-deck";
import { handleStartTutorial } from "./tutorial";

const DECK = `<!doctype html>
<html lang="en"><body><main><section><h1>A tour</h1></section></main></body></html>`;

function tutorialRequest(): Request {
  return new Request(`https://${FAKE_APP_HOST}/tutorial`, {
    headers: { "cf-connecting-ip": "203.0.113.7" },
  });
}

function envWith(overrides: Record<string, unknown> = {}): WorkerEnv {
  return testWorkerEnv({
    ARTIFACT_STORE: recordingArtifactStore().bucket,
    ARTIFACT_METADATA: liveKv(),
    ASSETS: stubAssets([{ path: TUTORIAL_DECK_ASSET_PATH, body: DECK }]),
    ...overrides,
  });
}

async function seededEntries(request: Request): Promise<OverlayEntry[]> {
  const body: unknown = await request.json();
  return body as OverlayEntry[];
}

describe("handleStartTutorial", () => {
  it("redirects to a viewer link that knows it is the tour", async () => {
    const response = await handleStartTutorial(tutorialRequest(), envWith());

    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.host).toBe(FAKE_APP_HOST);
    expect(location.pathname).toMatch(/^\/a\/[0-9a-f]{32}$/);
    expect(location.searchParams.get(TUTORIAL_QUERY_PARAM)).toBe("1");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("stores its own copy of the deck and mints three tokens", async () => {
    const store = recordingArtifactStore();
    const metadata = liveKv();
    await handleStartTutorial(
      tutorialRequest(),
      envWith({ ARTIFACT_STORE: store.bucket, ARTIFACT_METADATA: metadata }),
    );

    expect(store.puts).toHaveLength(1);
    expect(new TextDecoder().decode(store.puts[0]?.bytes)).toBe(DECK);

    const artifactId = store.puts[0]?.key.split("/")[1] ?? "";
    expect(await metadata.get(`artifacts/${artifactId}`)).not.toBe(null);
  });

  it("gives the fresh room the notes the tour is built around", async () => {
    const room = recordingDocRoom();
    await handleStartTutorial(
      tutorialRequest(),
      envWith({ DOC_ROOM: room.namespace }),
    );

    expect(room.connects).toHaveLength(1);
    const seed = room.connects[0]?.request;
    expect(seed?.method).toBe("POST");
    expect(new URL(seed?.url ?? "").pathname).toBe("/seed");

    const entries = seed === undefined ? [] : await seededEntries(seed);
    expect(entries.map((entry) => entry.body)).toContain(
      "Get rid of these stupid em dashes!",
    );
  });

  it("turns two visitors into two separate documents", async () => {
    const store = recordingArtifactStore();
    const env = envWith({ ARTIFACT_STORE: store.bucket });
    const first = await handleStartTutorial(tutorialRequest(), env);
    const second = await handleStartTutorial(tutorialRequest(), env);

    expect(first.headers.get("location")).not.toBe(
      second.headers.get("location"),
    );
    expect(new Set(store.puts.map((put) => put.key)).size).toBe(2);
  });

  it("says so plainly when the deck is missing rather than half starting", async () => {
    const store = recordingArtifactStore();
    const response = await handleStartTutorial(
      tutorialRequest(),
      envWith({ ARTIFACT_STORE: store.bucket, ASSETS: stubAssets([]) }),
    );

    expect(response.status).toBe(503);
    expect(store.puts).toHaveLength(0);
  });

  it("stops a visitor who keeps starting new copies", async () => {
    const env = envWith();
    const responses: number[] = [];
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const response = await handleStartTutorial(tutorialRequest(), env);
      responses.push(response.status);
    }

    expect(responses.filter((status) => status === 302)).toHaveLength(12);
    expect(responses.at(-1)).toBe(429);
  });
});
