import { useCallback, useEffect, useState } from "react";
import {
  setToolMessage,
  type AppToRuntimeMessage,
  type MarkTool,
} from "@/lib/protocol";

export type StickyIntent =
  { kind: "new" } | { kind: "replace"; markId: string };

type Armed =
  { tool: "sticky"; intent: StickyIntent } | { tool: "text"; intent: null };

export type ArmedTool = {
  stickyIntent: StickyIntent | null;
  editing: boolean;
  toggleSticky: () => void;
  armStickyFor: (markId: string) => void;
  toggleEditing: () => void;
  disarm: () => void;
};

export function useArmedTool(options: {
  ready: boolean;
  canMarkUp: boolean;
  canEdit: boolean;
  color: string;
  send: (message: AppToRuntimeMessage) => void;
}): ArmedTool {
  const { ready, canMarkUp, canEdit, color, send } = options;
  const [armed, setArmed] = useState<Armed | null>(null);

  const tool: MarkTool | null = armed?.tool ?? null;

  useEffect(() => {
    if (ready) {
      send(setToolMessage(tool, tool === "sticky" ? color : null));
    }
  }, [tool, ready, color, send]);

  useEffect(() => {
    setArmed((current) => {
      if (current?.tool === "sticky" && !canMarkUp) {
        return null;
      }
      if (current?.tool === "text" && !canEdit) {
        return null;
      }
      return current;
    });
  }, [canMarkUp, canEdit]);

  useEffect(() => {
    if (armed === null) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setArmed(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [armed]);

  return {
    stickyIntent: armed?.tool === "sticky" ? armed.intent : null,
    editing: armed?.tool === "text",
    toggleSticky: useCallback(
      () =>
        setArmed((current) =>
          current?.tool === "sticky"
            ? null
            : { tool: "sticky", intent: { kind: "new" } },
        ),
      [],
    ),
    armStickyFor: useCallback(
      (markId: string) =>
        setArmed({ tool: "sticky", intent: { kind: "replace", markId } }),
      [],
    ),
    toggleEditing: useCallback(
      () =>
        setArmed((current) =>
          current?.tool === "text" ? null : { tool: "text", intent: null },
        ),
      [],
    ),
    disarm: useCallback(() => setArmed(null), []),
  };
}
