import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { FakeWebSocket } from "@/lib/fakes";

// Every render mounts the comment room; without this each test dials a socket.
vi.stubGlobal("WebSocket", FakeWebSocket);

afterEach(() => {
  cleanup();
  FakeWebSocket.reset();
  // The reader's self-declared name outlives a render by design.
  window.localStorage.clear();
});
