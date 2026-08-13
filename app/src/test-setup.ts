import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { FakeWebSocket } from "@/lib/fakes";

function stubGlobals(): void {
  vi.stubGlobal("WebSocket", FakeWebSocket);
}

stubGlobals();

afterEach(() => {
  cleanup();
  FakeWebSocket.reset();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  stubGlobals();
});
