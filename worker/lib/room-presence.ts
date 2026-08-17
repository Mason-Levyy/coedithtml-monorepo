import {
  asRecord,
  parseReaderPresence,
  type ReaderPresence,
} from "@coedithtml/protocol";
import { readerWithinLimits } from "@/lib/entry-limits";
import { budgetIn, fullBudget, type MessageBudget } from "@/lib/message-budget";

export type RoomAttachment = {
  reader: ReaderPresence | null;
  canWrite: boolean;
  canEdit: boolean;
  budget: MessageBudget;
};

export function attachmentOf(
  socket: WebSocket,
  now: number = Date.now(),
): RoomAttachment {
  const raw: unknown = socket.deserializeAttachment();
  const record = asRecord(raw);
  if (record === null) {
    return {
      reader: null,
      canWrite: false,
      canEdit: false,
      budget: fullBudget(now),
    };
  }
  const reader = parseReaderPresence(record.reader);
  return {
    reader: reader !== null && readerWithinLimits(reader) ? reader : null,
    canWrite: record.canWrite === true,
    canEdit: record.canEdit === true,
    budget: budgetIn(record.budget, now),
  };
}

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
