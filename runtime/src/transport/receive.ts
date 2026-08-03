import { parseAppToRuntimeMessage, type AppToRuntimeMessage } from "./messages";
import { resolveAppOrigin } from "./origin";

export function listenForAppCommands(
  onCommand: (command: AppToRuntimeMessage) => void,
): () => void {
  function handleMessage(event: MessageEvent): void {
    const expectedOrigin = resolveAppOrigin();
    if (expectedOrigin === null || event.origin !== expectedOrigin) {
      return;
    }
    const command = parseAppToRuntimeMessage(event.data);
    if (command === null) {
      return;
    }
    onCommand(command);
  }

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}
