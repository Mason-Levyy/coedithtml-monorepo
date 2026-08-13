import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import { createElement, type ReactElement } from "react";

export function renderWithQueryClient(node: ReactElement): RenderResult {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(createElement(QueryClientProvider, { client, children: node }));
}

export class FakeWebSocket extends EventTarget {
  static readonly OPEN = 1;

  static opened: FakeWebSocket[] = [];

  static reset(): void {
    FakeWebSocket.opened = [];
  }

  static last(): FakeWebSocket | undefined {
    return FakeWebSocket.opened.at(-1);
  }

  readyState = 0;

  readonly sent: string[] = [];

  closed = false;

  constructor(readonly url: string = "") {
    super();
    FakeWebSocket.opened.push(this);
  }

  send(payload: string): void {
    this.sent.push(payload);
  }

  close(): void {
    this.closed = true;
  }

  accept(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatchEvent(new Event("open"));
  }

  deliver(payload: unknown): void {
    this.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(payload) }),
    );
  }

  drop(): void {
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }

  parsedSends(): unknown[] {
    return this.sent.map((payload: string): unknown => JSON.parse(payload));
  }
}
