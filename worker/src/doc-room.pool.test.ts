import { env } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";
import {
  addEntryMessage,
  helloMessage,
  patchEntryMessage,
  parseRoomToClientMessage,
  removeEntryMessage,
  type CommentEntry,
  type OverlayEntry,
  type RoomToClientMessage,
} from "@coedithtml/protocol";
import { ROOM_KIND_HEADER, ROOM_REVISION_HEADER } from "@/lib/room-headers";
import type { TokenKind } from "@/lib/room-capabilities";

const REVISION = "9f2c1a04b7e35d68";

const ANCHOR = {
  kind: "text" as const,
  quote: "Revenue grew 18%",
  prefix: "",
  suffix: " this quarter.",
  path: "p[1]",
  revision: REVISION,
};

function comment(overrides: Partial<CommentEntry> = {}): CommentEntry {
  return {
    kind: "comment",
    id: "c1",
    parentId: null,
    anchor: ANCHOR,
    body: "Net or gross?",
    author: { id: "reader-1", displayName: "Priya", source: "anonymous" },
    color: "yellow",
    fill: null,
    status: "open",
    createdAt: "2026-08-04T12:00:00.000Z",
    ...overrides,
  };
}

type Connection = {
  socket: WebSocket;
  seen: RoomToClientMessage[];
  next: () => Promise<RoomToClientMessage>;
};

function listen(socket: WebSocket): Connection {
  const seen: RoomToClientMessage[] = [];
  const queued: RoomToClientMessage[] = [];
  const waiting: ((message: RoomToClientMessage) => void)[] = [];

  socket.addEventListener("message", (event) => {
    const raw = typeof event.data === "string" ? event.data : "";
    const message = parseRoomToClientMessage(JSON.parse(raw));
    if (message === null) {
      throw new Error(`the room sent something unreadable: ${raw}`);
    }
    seen.push(message);
    const waiter = waiting.shift();
    if (waiter === undefined) {
      queued.push(message);
    } else {
      waiter(message);
    }
  });

  return {
    socket,
    seen,
    next: () => {
      const already = queued.shift();
      if (already !== undefined) {
        return Promise.resolve(already);
      }
      return new Promise<RoomToClientMessage>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("the room said nothing")),
          2000,
        );
        waiting.push((message) => {
          clearTimeout(timer);
          resolve(message);
        });
      });
    },
  };
}

const open: Connection[] = [];

afterEach(() => {
  for (const held of open.splice(0)) {
    if (held.socket.readyState !== WebSocket.CLOSED) {
      held.socket.close(1000, "test over");
    }
  }
});

async function connect(roomName: string, kind: TokenKind): Promise<Connection> {
  const stub = env.DOC_ROOM.get(env.DOC_ROOM.idFromName(roomName));
  const response = await stub.fetch("https://room.invalid/", {
    headers: {
      upgrade: "websocket",
      [ROOM_KIND_HEADER]: kind,
      [ROOM_REVISION_HEADER]: REVISION,
    },
  });
  const socket = response.webSocket;
  if (socket === null) {
    throw new Error(`the room refused the upgrade: ${response.status}`);
  }
  socket.accept();
  const connection = listen(socket);
  open.push(connection);
  return connection;
}

function send(connection: Connection, message: unknown): void {
  connection.socket.send(JSON.stringify(message));
}

function entriesIn(message: RoomToClientMessage): OverlayEntry[] {
  if (message.type !== "snapshot") {
    throw new Error(`expected a snapshot, got ${message.type}`);
  }
  return message.overlay.entries;
}

describe("a live DocRoom", () => {
  it("hands a new connection a snapshot stamped with the revision it was told", async () => {
    const reader = await connect("snapshot-room", "edit");
    const snapshot = await reader.next();

    expect(snapshot).toMatchObject({
      type: "snapshot",
      canWrite: true,
      overlay: { artifactRevision: REVISION, entries: [] },
    });
  });

  it("carries an entry one socket writes to the other", async () => {
    const writer = await connect("fanout-room", "edit");
    const watcher = await connect("fanout-room", "edit");
    await writer.next();
    await watcher.next();

    send(writer, addEntryMessage(comment()));

    expect(await watcher.next()).toMatchObject({
      type: "entry-added",
      entry: { id: "c1", body: "Net or gross?" },
    });
  });

  it("tells the writer as well, so both sides settle on one version", async () => {
    const writer = await connect("echo-room", "edit");
    await writer.next();

    send(writer, addEntryMessage(comment()));

    expect(await writer.next()).toMatchObject({ type: "entry-added" });
  });

  it("keeps what was written in SQLite, so a later reader sees it", async () => {
    const writer = await connect("durable-room", "edit");
    await writer.next();
    send(writer, addEntryMessage(comment()));
    await writer.next();

    const arriving = await connect("durable-room", "view");

    expect(entriesIn(await arriving.next())).toMatchObject([{ id: "c1" }]);
  });

  it("stamps the entry with its own clock rather than trusting the client", async () => {
    const writer = await connect("clock-room", "edit");
    await writer.next();

    send(
      writer,
      addEntryMessage(comment({ createdAt: "1999-01-01T00:00:00.000Z" })),
    );
    const added = await writer.next();

    expect(added).toMatchObject({ type: "entry-added" });
    if (added.type === "entry-added") {
      expect(added.entry.createdAt).not.toBe("1999-01-01T00:00:00.000Z");
    }
  });

  it("refuses a write from a read-only connection and tells only that socket", async () => {
    const writer = await connect("read-only-room", "edit");
    const viewer = await connect("read-only-room", "view");
    await writer.next();
    await viewer.next();

    send(viewer, addEntryMessage(comment({ id: "c9" })));

    expect(await viewer.next()).toMatchObject({
      type: "rejected",
      reason: "read-only",
      id: "c9",
    });
    expect(writer.seen.some((message) => message.type === "entry-added")).toBe(
      false,
    );
  });

  it("tells each connection what its own link may do", async () => {
    const viewer = await connect("capability-room", "view");
    const suggester = await connect("capability-room", "suggest");
    const editor = await connect("capability-room", "edit");

    expect(await viewer.next()).toMatchObject({
      canWrite: false,
      canEdit: false,
    });
    expect(await suggester.next()).toMatchObject({
      canWrite: true,
      canEdit: false,
    });
    expect(await editor.next()).toMatchObject({
      canWrite: true,
      canEdit: true,
    });
  });

  it("lets a suggest connection mark up the artifact", async () => {
    const suggester = await connect("suggest-room", "suggest");
    await suggester.next();

    send(suggester, addEntryMessage(comment({ id: "s1" })));

    expect(await suggester.next()).toMatchObject({ type: "entry-added" });
  });

  it("announces a reader to everyone once it says who it is", async () => {
    const first = await connect("presence-room", "edit");
    const second = await connect("presence-room", "edit");
    await first.next();
    await second.next();

    send(second, helloMessage({ id: "reader-2", displayName: "Sam" }));

    expect(await first.next()).toMatchObject({
      type: "presence",
      readers: [{ id: "reader-2", displayName: "Sam" }],
    });
  });

  it("drops a reader from presence when its socket closes", async () => {
    const staying = await connect("closing-room", "edit");
    const leaving = await connect("closing-room", "edit");
    await staying.next();
    await leaving.next();
    send(leaving, helloMessage({ id: "reader-2", displayName: "Sam" }));
    await staying.next();

    leaving.socket.close(1000, "done");

    expect(await staying.next()).toMatchObject({
      type: "presence",
      readers: [],
    });
  });

  it("applies a patch against stored state, not against what the client sent", async () => {
    const writer = await connect("patch-room", "edit");
    await writer.next();
    send(writer, addEntryMessage(comment()));
    await writer.next();

    send(writer, patchEntryMessage("c1", { status: "resolved" }));
    const patched = await writer.next();

    expect(patched).toMatchObject({
      type: "entry-patched",
      entry: { id: "c1", status: "resolved", body: "Net or gross?" },
    });
  });

  it("takes a thread's replies with it when the thread is removed", async () => {
    const writer = await connect("remove-room", "edit");
    await writer.next();
    send(writer, addEntryMessage(comment()));
    await writer.next();
    send(
      writer,
      addEntryMessage({
        ...comment(),
        kind: "reply",
        id: "r1",
        parentId: "c1",
      }),
    );
    await writer.next();

    send(writer, removeEntryMessage("c1"));
    await writer.next();

    const arriving = await connect("remove-room", "view");
    expect(entriesIn(await arriving.next())).toEqual([]);
  });

  it("treats a resent entry as the one it already has rather than a duplicate", async () => {
    const writer = await connect("reconnect-room", "edit");
    await writer.next();
    send(writer, addEntryMessage(comment()));
    await writer.next();

    send(
      writer,
      addEntryMessage(comment({ body: "Rewritten on the way back" })),
    );
    await writer.next();

    const arriving = await connect("reconnect-room", "view");
    expect(entriesIn(await arriving.next())).toMatchObject([
      { id: "c1", body: "Net or gross?" },
    ]);
  });

  it("answers anything that is not an upgrade with 426 rather than opening a room", async () => {
    const stub = env.DOC_ROOM.get(env.DOC_ROOM.idFromName("plain-room"));

    const response = await stub.fetch("https://room.invalid/");

    expect(response.status).toBe(426);
  });

  it("rejects a message it cannot parse without dropping the connection", async () => {
    const writer = await connect("garbage-room", "edit");
    await writer.next();

    writer.socket.send("not json at all");

    expect(await writer.next()).toMatchObject({
      type: "rejected",
      reason: "malformed",
    });
  });
});
