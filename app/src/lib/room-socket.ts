import {
  parseRoomToClientMessage,
  type ClientToRoomMessage,
  type RoomToClientMessage,
} from "@/lib/protocol";

export type RoomStatus = "connecting" | "open" | "closed";

const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 15000;

export function backoffDelay(attempt: number, random = Math.random): number {
  const ceiling = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return Math.round(ceiling * (0.5 + random() * 0.5));
}

export type RoomSocket = {
  send(message: ClientToRoomMessage): void;
  close(): void;
};

export type RoomSocketOptions = {
  url: string;
  onMessage: (message: RoomToClientMessage) => void;
  onStatus: (status: RoomStatus) => void;
  createSocket?: (url: string) => WebSocket;
};

function readMessage(data: unknown): RoomToClientMessage | null {
  if (typeof data !== "string") {
    return null;
  }
  try {
    return parseRoomToClientMessage(JSON.parse(data));
  } catch {
    return null;
  }
}

function openOrNull(
  createSocket: (url: string) => WebSocket,
  url: string,
): WebSocket | null {
  try {
    return createSocket(url);
  } catch (cause) {
    console.error("Could not open the comment room", cause);
    return null;
  }
}

export function openRoom(options: RoomSocketOptions): RoomSocket {
  const createSocket =
    options.createSocket ?? ((url: string) => new WebSocket(url));
  const pending: ClientToRoomMessage[] = [];
  let socket: WebSocket | null = null;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let givenUp = false;

  function flush(): void {
    if (socket === null || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const queued = pending.splice(0, pending.length);
    for (const message of queued) {
      socket.send(JSON.stringify(message));
    }
  }

  function scheduleRetry(): void {
    if (givenUp) {
      return;
    }
    retryTimer = setTimeout(() => {
      attempt += 1;
      connect();
    }, backoffDelay(attempt));
  }

  function connect(): void {
    if (givenUp) {
      return;
    }
    options.onStatus("connecting");
    const next = openOrNull(createSocket, options.url);
    if (next === null) {
      options.onStatus("closed");
      scheduleRetry();
      return;
    }
    socket = next;

    next.addEventListener("open", () => {
      attempt = 0;
      options.onStatus("open");
      flush();
    });
    next.addEventListener("message", (event: MessageEvent) => {
      const message = readMessage(event.data);
      if (message !== null) {
        options.onMessage(message);
      }
    });
    next.addEventListener("close", () => {
      socket = null;
      options.onStatus("closed");
      scheduleRetry();
    });
  }

  connect();

  return {
    send(message: ClientToRoomMessage): void {
      pending.push(message);
      flush();
    },
    close(): void {
      givenUp = true;
      if (retryTimer !== null) {
        clearTimeout(retryTimer);
      }
      socket?.close();
      socket = null;
    },
  };
}
