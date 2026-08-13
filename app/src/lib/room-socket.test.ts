import { describe, expect, it, vi } from "vitest";
import { FakeWebSocket } from "@/lib/fakes";
import { addEntryMessage, type RoomToClientMessage } from "@/lib/protocol";
import { backoffDelay, openRoom, type RoomStatus } from "@/lib/room-socket";

function harness() {
  const sockets: FakeWebSocket[] = [];
  const received: RoomToClientMessage[] = [];
  const statuses: RoomStatus[] = [];
  const room = openRoom({
    url: "wss://app.test/api/artifacts/tok/room",
    onMessage: (message) => received.push(message),
    onStatus: (status) => statuses.push(status),
    createSocket: (url) => {
      const socket = new FakeWebSocket(url);
      sockets.push(socket);
      return socket as unknown as WebSocket;
    },
  });
  return { room, sockets, received, statuses };
}

const ENTRY = {
  kind: "comment" as const,
  id: "c1",
  parentId: null,
  anchor: {
    kind: "text" as const,
    quote: "Revenue grew",
    prefix: "",
    suffix: "",
    path: "p[1]",
    revision: "r1",
  },
  body: "Net or gross?",
  author: { id: "reader-1", displayName: "Sam", source: "anonymous" as const },
  color: "yellow" as const,
  fill: null,
  status: "open" as const,
  createdAt: "2026-08-04T12:00:00.000Z",
};

describe("backoffDelay", () => {
  it("grows with each attempt", () => {
    const steady = () => 1;

    expect(backoffDelay(0, steady)).toBeLessThan(backoffDelay(3, steady));
  });

  it("stops growing at the ceiling", () => {
    const steady = () => 1;

    expect(backoffDelay(20, steady)).toBe(backoffDelay(30, steady));
  });

  it("spreads two readers retrying at the same attempt", () => {
    expect(backoffDelay(4, () => 0)).not.toBe(backoffDelay(4, () => 1));
  });
});

describe("openRoom", () => {
  it("reports each step of connecting", () => {
    const { sockets, statuses } = harness();
    sockets[0]?.accept();

    expect(statuses).toEqual(["connecting", "open"]);
  });

  it("delivers a message the room sent", () => {
    const { sockets, received } = harness();
    sockets[0]?.accept();
    sockets[0]?.deliver({
      version: 1,
      type: "entry-added",
      entry: ENTRY,
    });

    expect(received).toHaveLength(1);
  });

  it("ignores anything that is not a room message", () => {
    const { sockets, received } = harness();
    sockets[0]?.accept();
    sockets[0]?.deliver({ version: 99, type: "entry-added", entry: ENTRY });
    sockets[0]?.dispatchEvent(
      new MessageEvent("message", { data: "not json at all" }),
    );

    expect(received).toEqual([]);
  });

  it("holds what was sent before the socket opened and flushes it", () => {
    const { room, sockets } = harness();
    room.send(addEntryMessage(ENTRY));

    expect(sockets[0]?.sent).toEqual([]);

    sockets[0]?.accept();

    expect(sockets[0]?.sent).toHaveLength(1);
  });

  it("dials again after the room drops", () => {
    vi.useFakeTimers();
    try {
      const { sockets } = harness();
      sockets[0]?.accept();
      sockets[0]?.drop();
      vi.advanceTimersByTime(MAX_BACKOFF_MS);

      expect(sockets).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops dialling once it is closed", () => {
    vi.useFakeTimers();
    try {
      const { room, sockets } = harness();
      sockets[0]?.accept();
      room.close();
      sockets[0]?.drop();
      vi.advanceTimersByTime(MAX_BACKOFF_MS);

      expect(sockets).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("survives a socket that will not open at all", () => {
    const statuses: RoomStatus[] = [];
    const room = openRoom({
      url: "wss://app.test/room",
      onMessage: () => {},
      onStatus: (status) => statuses.push(status),
      createSocket: () => {
        throw new Error("blocked by the browser");
      },
    });
    room.close();

    expect(statuses).toEqual(["connecting", "closed"]);
  });
});

const MAX_BACKOFF_MS = 15000;
