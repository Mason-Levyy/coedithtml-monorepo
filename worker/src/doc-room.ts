import { DurableObject } from "cloudflare:workers";
import {
  emptyOverlay,
  parseClientToRoomMessage,
  parseOverlayEntry,
  presenceMessage,
  rejectedMessage,
  snapshotMessage,
  type OverlayDocument,
  type OverlayEntry,
  type RoomToClientMessage,
} from "@coedithtml/protocol";
import { readerWithinLimits } from "@/lib/entry-limits";
import { createEntryStore } from "@/lib/entry-store-sqlite";
import { fullBudget, spendMessage } from "@/lib/message-budget";
import {
  applyClientMessage,
  entryIdIn,
  MAX_ENTRIES_PER_ROOM,
  type EntryStore,
} from "@/lib/overlay-log";
import { capabilitiesInHeader } from "@/lib/room-capabilities";
import { attachmentOf, readersAmong } from "@/lib/room-presence";
import {
  ROOM_KIND_HEADER,
  ROOM_OVERLAY_PATH,
  ROOM_REVISION_HEADER,
  ROOM_SEED_PATH,
  ROOM_WIPE_PATH,
} from "@/lib/room-headers";

const MAX_CONNECTIONS = 64;

// Comfortably past the largest legitimate message -- one entry with a 4000
// character body -- and far short of anything worth parsing as an attack.
const MAX_MESSAGE_BYTES = 32 * 1024;

function decodeClientMessage(
  raw: string,
): ReturnType<typeof parseClientToRoomMessage> {
  try {
    return parseClientToRoomMessage(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function entriesInBody(request: Request): Promise<OverlayEntry[] | null> {
  const body: unknown = await request.json().catch(() => null);
  if (!Array.isArray(body) || body.length > MAX_ENTRIES_PER_ROOM) {
    return null;
  }
  const entries: OverlayEntry[] = [];
  for (const candidate of body) {
    const entry = parseOverlayEntry(candidate);
    if (entry === null) {
      return null;
    }
    entries.push(entry);
  }
  return entries;
}

export class DocRoom extends DurableObject<Env> {
  private readonly entries: EntryStore;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.entries = createEntryStore(ctx.storage.sql);
  }

  override fetch(request: Request): Response | Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === ROOM_OVERLAY_PATH) {
      const revision = request.headers.get(ROOM_REVISION_HEADER) ?? "unknown";
      return Response.json(this.overlay(revision));
    }
    if (pathname === ROOM_SEED_PATH) {
      return this.seedOnce(request);
    }
    if (pathname === ROOM_WIPE_PATH) {
      return this.wipe();
    }
    if (request.headers.get("upgrade") !== "websocket") {
      return new Response("Expected a websocket upgrade.", { status: 426 });
    }
    if (this.ctx.getWebSockets().length >= MAX_CONNECTIONS) {
      return new Response("Too many readers in this room.", { status: 503 });
    }

    const capabilities = capabilitiesInHeader(
      request.headers.get(ROOM_KIND_HEADER),
    );
    const revision = request.headers.get(ROOM_REVISION_HEADER) ?? "unknown";
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    if (client === undefined || server === undefined) {
      return new Response("Could not open the room.", { status: 500 });
    }

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      reader: null,
      ...capabilities,
      budget: fullBudget(Date.now()),
    });
    this.sendTo(
      server,
      snapshotMessage({
        overlay: this.overlay(revision),
        readers: readersAmong(this.ctx.getWebSockets()),
        ...capabilities,
      }),
    );
    return new Response(null, { status: 101, webSocket: client });
  }

  override webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
    const now = Date.now();
    const attachment = attachmentOf(socket, now);
    const spend = spendMessage(attachment.budget, now);
    socket.serializeAttachment({ ...attachment, budget: spend.budget });
    if (!spend.allowed) {
      this.sendTo(socket, rejectedMessage("too-fast"));
      return;
    }

    if (typeof raw !== "string" || raw.length > MAX_MESSAGE_BYTES) {
      this.sendTo(socket, rejectedMessage("malformed"));
      return;
    }
    const message = decodeClientMessage(raw);
    if (message === null) {
      this.sendTo(socket, rejectedMessage("malformed"));
      return;
    }

    if (message.type === "hello") {
      const named = readerWithinLimits(message.reader) ? message.reader : null;
      if (named === null) {
        this.sendTo(socket, rejectedMessage("too-long"));
        return;
      }
      socket.serializeAttachment({
        ...attachment,
        budget: spend.budget,
        reader: named,
      });
      this.broadcast(presenceMessage(readersAmong(this.ctx.getWebSockets())));
      return;
    }
    if (!attachment.canWrite) {
      this.sendTo(socket, rejectedMessage("read-only", entryIdIn(message)));
      return;
    }

    const outcome = applyClientMessage(this.entries, message, {
      now: new Date().toISOString(),
      canEdit: attachment.canEdit,
    });
    if (outcome === null) {
      return;
    }
    if (!outcome.ok) {
      this.sendTo(socket, rejectedMessage(outcome.reason, outcome.id));
      return;
    }
    this.broadcast(outcome.broadcast);
  }

  override webSocketClose(socket: WebSocket) {
    this.broadcast(
      presenceMessage(readersAmong(this.ctx.getWebSockets(), socket)),
    );
  }

  override webSocketError(socket: WebSocket, error: unknown) {
    console.error("A room connection failed", error);
    this.broadcast(
      presenceMessage(readersAmong(this.ctx.getWebSockets(), socket)),
    );
  }

  // Deleting an artifact used to leave its room behind: every comment, every
  // sticky, every edit, held for ever in a document nobody can reach. The
  // sockets go first, because a connection outliving its document would sit
  // there writing into storage that has just been cleared.
  private async wipe(): Promise<Response> {
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.close(1001, "This file was deleted");
      } catch (cause) {
        console.error("Could not close a room connection", cause);
      }
    }
    await this.ctx.storage.deleteAll();
    return new Response(null, { status: 204 });
  }

  private async seedOnce(request: Request): Promise<Response> {
    if (this.entries.count() > 0) {
      return new Response("This room already holds entries.", { status: 409 });
    }
    const entries = await entriesInBody(request);
    if (entries === null) {
      return new Response("Malformed seed entries.", { status: 400 });
    }
    for (const entry of entries) {
      this.entries.put(entry);
    }
    return new Response(null, { status: 204 });
  }

  private overlay(artifactRevision: string): OverlayDocument {
    return { ...emptyOverlay(artifactRevision), entries: this.entries.list() };
  }

  private sendTo(socket: WebSocket, message: RoomToClientMessage): void {
    try {
      socket.send(JSON.stringify(message));
    } catch (cause) {
      console.error("Could not reach a room connection", cause);
    }
  }

  private broadcast(message: RoomToClientMessage): void {
    for (const socket of this.ctx.getWebSockets()) {
      this.sendTo(socket, message);
    }
  }
}
