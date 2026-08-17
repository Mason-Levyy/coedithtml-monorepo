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
  saveStateOf,
  writeSent,
  writesAbandoned,
  type RoomContents,
  type SaveState,
} from "@/lib/room-state";
import {
  stepForAdd,
  stepForPatch,
  stepForRemove,
  type Reversal,
  type Step,
} from "@/lib/undo-stack";

export type DocRoom = RoomContents & {
  status: RoomStatus;
  saveState: SaveState;
  canUndo: boolean;
  canRedo: boolean;
  addEntry: (entry: OverlayEntry) => void;
  patchEntry: (id: string, patch: EntryPatch) => void;
  removeEntry: (id: string) => void;
  // Both report whether the step they ran touched the artifact's own text, so
  // the caller knows to reload the frame. Applied edits cannot be walked back
  // in place: replayEdits only ever moves forward.
  undo: () => boolean;
  redo: () => boolean;
  dismissRejection: () => void;
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
  const entriesRef = useRef(contents.entries);
  entriesRef.current = contents.entries;
  const done = useRef<Step[]>([]);
  const undone = useRef<Step[]>([]);
  const [depths, setDepths] = useState({ done: 0, undone: 0 });

  const remember = useCallback((step: Step | null) => {
    if (step === null) {
      return;
    }
    done.current = [...done.current, step];
    undone.current = [];
    setDepths({ done: done.current.length, undone: 0 });
  }, []);

  const dismissRejection = useCallback(() => {
    setContents((previous) =>
      previous.rejection !== null ? { ...previous, rejection: null } : previous,
    );
  }, []);

  useEffect(() => {
    if (contents.rejection !== null) {
      const timer = setTimeout(dismissRejection, 3500);
      return () => clearTimeout(timer);
    }
  }, [contents.rejection, dismissRejection]);

  useEffect(() => {
    if (url === null) {
      return;
    }
    setContents(EMPTY_ROOM);
    // A new connection is a new session. Undoing across one would replay
    // inverses against entries the room may no longer be holding.
    done.current = [];
    undone.current = [];
    setDepths({ done: 0, undone: 0 });

    const socket = openRoom({
      url,
      onMessage: (message) =>
        setContents((previous) => applyRoomMessage(previous, message)),
      onStatus: (next) => {
        setStatus(next);
        if (next === "open") {
          socket.send(helloMessage(readerRef.current));
          return;
        }
        // A socket that went away with writes still in flight took them with
        // it. Saying "saved" here would be the one lie that costs somebody
        // their words.
        setContents(writesAbandoned);
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

  const sendAdd = useCallback(
    (entry: OverlayEntry) => {
      dismissRejection();
      setContents((previous) => writeSent(previous, entry.id));
      send(addEntryMessage(entry));
    },
    [dismissRejection, send],
  );
  const sendPatch = useCallback(
    (id: string, patch: EntryPatch) => {
      dismissRejection();
      setContents((previous) =>
        writeSent(applyLocalPatch(previous, id, patch), id),
      );
      send(patchEntryMessage(id, patch));
    },
    [dismissRejection, send],
  );
  const sendRemove = useCallback(
    (id: string) => {
      dismissRejection();
      setContents((previous) => writeSent(applyLocalRemove(previous, id), id));
      send(removeEntryMessage(id));
    },
    [dismissRejection, send],
  );

  const run = useCallback(
    (reversal: Reversal) => {
      if (reversal.kind === "add") {
        sendAdd(reversal.entry);
        return;
      }
      if (reversal.kind === "remove") {
        sendRemove(reversal.id);
        return;
      }
      sendPatch(reversal.id, reversal.patch);
    },
    [sendAdd, sendPatch, sendRemove],
  );

  const addEntry = useCallback(
    (entry: OverlayEntry) => {
      remember(stepForAdd(entry));
      sendAdd(entry);
    },
    [remember, sendAdd],
  );
  const patchEntry = useCallback(
    (id: string, patch: EntryPatch) => {
      remember(stepForPatch(entriesRef.current, id, patch));
      sendPatch(id, patch);
    },
    [remember, sendPatch],
  );
  const removeEntry = useCallback(
    (id: string) => {
      remember(stepForRemove(entriesRef.current, id));
      sendRemove(id);
    },
    [remember, sendRemove],
  );

  const undo = useCallback(() => {
    const step = done.current.at(-1);
    if (step === undefined) {
      return false;
    }
    done.current = done.current.slice(0, -1);
    undone.current = [...undone.current, step];
    setDepths({ done: done.current.length, undone: undone.current.length });
    step.undo.forEach(run);
    return step.touchesText;
  }, [run]);

  const redo = useCallback(() => {
    const step = undone.current.at(-1);
    if (step === undefined) {
      return false;
    }
    undone.current = undone.current.slice(0, -1);
    done.current = [...done.current, step];
    setDepths({ done: done.current.length, undone: undone.current.length });
    step.redo.forEach(run);
    return step.touchesText;
  }, [run]);

  return {
    ...contents,
    status,
    saveState: saveStateOf(contents),
    canUndo: depths.done > 0,
    canRedo: depths.undone > 0,
    addEntry,
    patchEntry,
    removeEntry,
    undo,
    redo,
    dismissRejection,
  };
}
