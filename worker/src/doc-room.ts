import { DurableObject } from "cloudflare:workers";
import {
  OVERLAY_VERSION,
  parseClientToRoomMessage,
  presenceMessage,
  rejectedMessage,
  snapshotMessage,
  type OverlayDocument,
  type RoomToClientMessage,
} from "@coedithtml/protocol";
import { createEntryStore } from "@/lib/entry-store-sqlite";
import { applyClientMessage, type EntryStore } from "@/lib/overlay-log";
import { attachmentOf, readersAmong } from "@/lib/room-presence";
import { ROOM_REVISION_HEADER, ROOM_WRITE_HEADER } from "@/lib/room-headers";

const MAX_CONNECTIONS = 64;

function decodeClientMessage(
  raw: string,
): ReturnType<typeof parseClientToRoomMessage> {
  try {
    return parseClientToRoomMessage(JSON.parse(raw));
  } catch {
    return null;
  }
}

export class DocRoom extends DurableObject<Env> {
  private readonly entries: EntryStore;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.entries = createEntryStore(ctx.storage.sql);
  }

  // Only reachable through a stub, so the route's headers are our own words.
  override fetch(request: Request): Response {
    if (request.headers.get("upgrade") !== "websocket") {
      return new Response("Expected a websocket upgrade.", { status: 426 });
    }
    if (this.ctx.getWebSockets().length >= MAX_CONNECTIONS) {
      return new Response("Too many readers in this room.", { status: 503 });
    }

    const canWrite = request.headers.get(ROOM_WRITE_HEADER) === "yes";
    const revision = request.headers.get(ROOM_REVISION_HEADER) ?? "unknown";
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    if (client === undefined || server === undefined) {
      return new Response("Could not open the room.", { status: 500 });
    }

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ reader: null, canWrite });
    this.sendTo(
      server,
      snapshotMessage({
        overlay: this.overlay(revision),
        readers: readersAmong(this.ctx.getWebSockets()),
        canWrite,
      }),
    );
    return new Response(null, { status: 101, webSocket: client });
  }

  override webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== "string") {
      this.sendTo(socket, rejectedMessage("malformed"));
      return;
    }
    const message = decodeClientMessage(raw);
    if (message === null) {
      this.sendTo(socket, rejectedMessage("malformed"));
      return;
    }

    const attachment = attachmentOf(socket);
    if (message.type === "hello") {
      socket.serializeAttachment({ ...attachment, reader: message.reader });
      this.broadcast(presenceMessage(readersAmong(this.ctx.getWebSockets())));
      return;
    }
    if (!attachment.canWrite) {
      this.sendTo(socket, rejectedMessage("read-only"));
      return;
    }

    const outcome = applyClientMessage(
      this.entries,
      message,
      new Date().toISOString(),
    );
    if (outcome === null) {
      return;
    }
    if (!outcome.ok) {
      this.sendTo(socket, rejectedMessage(outcome.reason));
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

  private overlay(artifactRevision: string): OverlayDocument {
    return {
      version: OVERLAY_VERSION,
      artifactRevision,
      entries: this.entries.list(),
    };
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
