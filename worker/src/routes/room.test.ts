import { describe, expect, it } from "vitest";
import {
  FAKE_APP_HOST,
  FAKE_ROOM_HEADER,
  FAKE_SANDBOX_HOST,
  liveKv,
  recordingDocRoom,
  testWorkerEnv,
} from "@/lib/fakes";
import { hashArtifactPassword } from "@/lib/password";
import { ROOM_REVISION_HEADER, ROOM_WRITE_HEADER } from "@/lib/room-headers";
import { accessTokenKey, artifactMetadataKey } from "@/lib/storage-keys";
import { handleRoomConnect } from "./room";

const ARTIFACT_ID = "a".repeat(32);
const VIEW_TOKEN = "c".repeat(32);
const EDIT_TOKEN = "d".repeat(32);
const APP_ORIGIN = `https://${FAKE_APP_HOST}`;

async function seededKv(password?: string): Promise<KVNamespace> {
  const passwordHash =
    password === undefined ? undefined : await hashArtifactPassword(password);
  return liveKv([
    {
      key: accessTokenKey(VIEW_TOKEN),
      value: { artifactId: ARTIFACT_ID, kind: "view" },
    },
    {
      key: accessTokenKey(EDIT_TOKEN),
      value: { artifactId: ARTIFACT_ID, kind: "edit" },
    },
    {
      key: artifactMetadataKey(ARTIFACT_ID),
      value: {
        fileName: "deck.html",
        size: 42,
        uploadedAt: "2026-08-01T00:00:00.000Z",
        ...(passwordHash === undefined ? {} : { passwordHash }),
      },
    },
  ]);
}

function upgradeRequest(
  token: string,
  overrides: { origin?: string | null; upgrade?: string | null } = {},
): Request {
  const headers = new Headers();
  const upgrade =
    overrides.upgrade === undefined ? "websocket" : overrides.upgrade;
  if (upgrade !== null) {
    headers.set("upgrade", upgrade);
  }
  const origin = overrides.origin === undefined ? APP_ORIGIN : overrides.origin;
  if (origin !== null) {
    headers.set("origin", origin);
  }
  return new Request(`https://${FAKE_APP_HOST}/api/artifacts/${token}/room`, {
    headers,
  });
}

async function connect(
  token: string,
  overrides: Parameters<typeof upgradeRequest>[1] = {},
) {
  const room = recordingDocRoom();
  const response = await handleRoomConnect(
    token,
    upgradeRequest(token, overrides),
    testWorkerEnv({
      ARTIFACT_METADATA: await seededKv(),
      DOC_ROOM: room.namespace,
    }),
  );
  return { response, room };
}

describe("handleRoomConnect", () => {
  it("opens the room for a valid edit token", async () => {
    const { response, room } = await connect(EDIT_TOKEN);

    expect(response.headers.get(FAKE_ROOM_HEADER)).toBe("connected");
    expect(room.connects).toHaveLength(1);
  });

  it("routes both of an artifact's tokens to the same room", async () => {
    const viewSide = await connect(VIEW_TOKEN);
    const editSide = await connect(EDIT_TOKEN);

    expect(viewSide.room.connects[0]?.name).toBe(ARTIFACT_ID);
    expect(editSide.room.connects[0]?.name).toBe(ARTIFACT_ID);
  });

  it("grants writing to an edit token", async () => {
    const { room } = await connect(EDIT_TOKEN);

    expect(room.connects[0]?.request.headers.get(ROOM_WRITE_HEADER)).toBe(
      "yes",
    );
  });

  it("withholds writing from a view token", async () => {
    const { room } = await connect(VIEW_TOKEN);

    expect(room.connects[0]?.request.headers.get(ROOM_WRITE_HEADER)).toBe("no");
  });

  it("tells the room which artifact it is holding marks for", async () => {
    const { room } = await connect(EDIT_TOKEN);

    expect(room.connects[0]?.request.headers.get(ROOM_REVISION_HEADER)).toBe(
      ARTIFACT_ID,
    );
  });

  it("refuses an upgrade from the sandbox origin", async () => {
    const { response, room } = await connect(EDIT_TOKEN, {
      origin: `https://${FAKE_SANDBOX_HOST}`,
    });

    expect(response.status).toBe(404);
    expect(room.connects).toHaveLength(0);
  });

  it("refuses an upgrade from any other origin", async () => {
    const { response } = await connect(EDIT_TOKEN, {
      origin: "https://evil.example",
    });

    expect(response.status).toBe(404);
  });

  it("refuses an upgrade that declares no origin", async () => {
    const { response } = await connect(EDIT_TOKEN, { origin: null });

    expect(response.status).toBe(404);
  });

  it("refuses a plain request that is not an upgrade", async () => {
    const { response, room } = await connect(EDIT_TOKEN, { upgrade: null });

    expect(response.status).toBe(426);
    expect(room.connects).toHaveLength(0);
  });

  it("refuses a token that does not exist", async () => {
    const { response } = await connect("f".repeat(32));

    expect(response.status).toBe(404);
  });

  it("refuses a malformed token", async () => {
    const { response } = await connect("not-a-token");

    expect(response.status).toBe(404);
  });

  it("refuses to open a password-locked room without a grant", async () => {
    const room = recordingDocRoom();
    const response = await handleRoomConnect(
      EDIT_TOKEN,
      upgradeRequest(EDIT_TOKEN),
      testWorkerEnv({
        ARTIFACT_METADATA: await seededKv("hunter2"),
        DOC_ROOM: room.namespace,
      }),
    );

    expect(response.status).toBe(401);
    expect(room.connects).toHaveLength(0);
  });
});
