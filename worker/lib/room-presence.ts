import {
  asRecord,
  parseReaderPresence,
  type ReaderPresence,
} from "@coedithtml/protocol";

export type RoomAttachment = {
  reader: ReaderPresence | null;
  canWrite: boolean;
};

const ANONYMOUS_READER: RoomAttachment = { reader: null, canWrite: false };

export function attachmentOf(socket: WebSocket): RoomAttachment {
  const raw: unknown = socket.deserializeAttachment();
  const record = asRecord(raw);
  if (record === null) {
    return ANONYMOUS_READER;
  }
  return {
    reader: parseReaderPresence(record.reader),
    canWrite: record.canWrite === true,
  };
}

// Two tabs are one person, so presence is keyed by reader rather than socket.
export function readersAmong(
  sockets: readonly WebSocket[],
  leaving?: WebSocket,
): ReaderPresence[] {
  const byId = new Map<string, ReaderPresence>();
  for (const socket of sockets) {
    if (socket === leaving) {
      continue;
    }
    const { reader } = attachmentOf(socket);
    if (reader !== null) {
      byId.set(reader.id, reader);
    }
  }
  return Array.from(byId.values());
}
