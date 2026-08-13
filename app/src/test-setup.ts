import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { FakeWebSocket } from "@/lib/fakes";

vi.stubGlobal("WebSocket", FakeWebSocket);

afterEach(() => {
  cleanup();
  FakeWebSocket.reset();
  window.localStorage.clear();
});
