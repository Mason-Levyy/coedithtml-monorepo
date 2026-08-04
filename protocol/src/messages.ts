export const BRIDGE_VERSION = 1;

type Versioned = { version: typeof BRIDGE_VERSION };

export type RuntimeReadyMessage = Versioned & {
  type: "ready";
  title: string;
};

export type RuntimeToAppMessage = RuntimeReadyMessage;

export function readyMessage(title: string): RuntimeReadyMessage {
  return { version: BRIDGE_VERSION, type: "ready", title };
}
