import { useCallback, useEffect, useRef, useState } from "react";
import {
  addEntryMessage,
  helloMessage,
  patchEntryMessage,
  removeEntryMessage,
  type ClientToRoomMessage,
  type EntryPatch,
  type OverlayEntry,
  type ReaderPresence,
} from "@/lib/protocol";
import { openRoom, type RoomSocket, type RoomStatus } from "@/lib/room-socket";
import {
  EMPTY_ROOM,
  applyLocalPatch,
  applyLocalRemove,
  applyRoomMessage,
  type RoomContents,
} from "@/lib/room-state";

export type DocRoom = RoomContents & {
  status: RoomStatus;
  addEntry: (entry: OverlayEntry) => void;
  patchEntry: (id: string, patch: EntryPatch) => void;
  removeEntry: (id: string) => void;
};

export function useDocRoom(
  url: string | null,
  reader: ReaderPresence,
): DocRoom {
  const [contents, setContents] = useState<RoomContents>(EMPTY_ROOM);
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const socketRef = useRef<RoomSocket | null>(null);
  const readerRef = useRef(reader);
  readerRef.current = reader;

  useEffect(() => {
    if (url === null) {
      return;
    }
    setContents(EMPTY_ROOM);

    const socket = openRoom({
      url,
      onMessage: (message) =>
        setContents((previous) => applyRoomMessage(previous, message)),
      onStatus: (next) => {
        setStatus(next);
        if (next === "open") {
          socket.send(helloMessage(readerRef.current));
        }
      },
    });
    socketRef.current = socket;

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [url]);

  const send = useCallback((message: ClientToRoomMessage) => {
    socketRef.current?.send(message);
  }, []);

  useEffect(() => {
    if (status === "open") {
      send(helloMessage(reader));
    }
  }, [reader, send, status]);

  const addEntry = useCallback(
    (entry: OverlayEntry) => send(addEntryMessage(entry)),
    [send],
  );
  const patchEntry = useCallback(
    (id: string, patch: EntryPatch) => {
      setContents((previous) => applyLocalPatch(previous, id, patch));
      send(patchEntryMessage(id, patch));
    },
    [send],
  );
  const removeEntry = useCallback(
    (id: string) => {
      setContents((previous) => applyLocalRemove(previous, id));
      send(removeEntryMessage(id));
    },
    [send],
  );

  return { ...contents, status, addEntry, patchEntry, removeEntry };
}
