import { describe, expect, it } from "vitest";
import { FAKE_APP_HOST, testWorkerEnv } from "@/lib/fakes";
import { PROTOCOL_VERSION_META } from "@/lib/schemas/mcp";
import { handleAppRequest } from "../app";
import { MODERN_PROTOCOL_VERSION } from "./versions";

type Body = Record<string, unknown>;

function post(body: Body, headers: Record<string, string> = {}): Request {
  return new Request(`https://${FAKE_APP_HOST}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function modern(method: string, params: Body = {}): Request {
  return post(
    {
      jsonrpc: "2.0",
      id: 1,
      method,
      params: {
        ...params,
        _meta: { [PROTOCOL_VERSION_META]: MODERN_PROTOCOL_VERSION },
      },
    },
    {
      "mcp-protocol-version": MODERN_PROTOCOL_VERSION,
      "mcp-method": method,
    },
  );
}

function legacy(method: string, params: Body = {}): Request {
  return post({ jsonrpc: "2.0", id: 1, method, params });
}

async function send(request: Request, env = testWorkerEnv()): Promise<Body> {
  const response = await handleAppRequest(request, env);
  return { status: response.status, ...((await response.json()) as Body) };
}

describe("the MCP endpoint", () => {
  it("is not there at all when it is switched off", async () => {
    const response = await handleAppRequest(
      modern("server/discover"),
      testWorkerEnv({ MCP_ENABLED: "false" }),
    );

    expect(response.status).toBe(404);
  });

  it("refuses the GET a pre-2026 client would open a stream with", async () => {
    const response = await handleAppRequest(
      new Request(`https://${FAKE_APP_HOST}/mcp`),
      testWorkerEnv(),
    );

    expect(response.status).toBe(405);
  });

  it("answers server/discover with the versions it speaks", async () => {
    const body = await send(modern("server/discover"));

    expect(body.status).toBe(200);
    expect(body.result).toMatchObject({
      protocolVersions: [MODERN_PROTOCOL_VERSION],
      serverInfo: { name: "coedit" },
      resultType: "complete",
    });
  });

  it("lists tools with the caching fields the revision requires", async () => {
    const body = await send(modern("tools/list"));
    const result = body.result as Body;

    expect(result.tools).toEqual([]);
    expect(result.cacheScope).toBe("public");
    expect(typeof result.ttlMs).toBe("number");
  });

  it("refuses a request whose header disagrees with its body", async () => {
    const body = await send(
      post(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {
            _meta: { [PROTOCOL_VERSION_META]: MODERN_PROTOCOL_VERSION },
          },
        },
        {
          "mcp-protocol-version": MODERN_PROTOCOL_VERSION,
          "mcp-method": "tools/call",
        },
      ),
    );

    expect(body.status).toBe(400);
    expect(body.error).toMatchObject({ code: -32020 });
  });

  it("names the versions it supports when asked for one it does not", async () => {
    const body = await send(
      post(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: { _meta: { [PROTOCOL_VERSION_META]: "1900-01-01" } },
        },
        { "mcp-protocol-version": "1900-01-01", "mcp-method": "tools/list" },
      ),
    );

    expect(body.status).toBe(400);
    expect(body.error).toMatchObject({
      code: -32022,
      data: { supported: [MODERN_PROTOCOL_VERSION], requested: "1900-01-01" },
    });
  });

  it("answers a method it does not have with 404 rather than silence", async () => {
    const body = await send(modern("resources/list"));

    expect(body.status).toBe(404);
    expect(body.error).toMatchObject({ code: -32601 });
  });

  it("shakes hands with a client that still opens with initialize", async () => {
    const body = await send(
      legacy("initialize", { protocolVersion: "2025-06-18" }),
    );

    expect(body.status).toBe(200);
    expect(body.result).toMatchObject({
      protocolVersion: "2025-06-18",
      serverInfo: { name: "coedit" },
    });
  });

  it("offers a legacy client a version it can speak when it asks for a modern one", async () => {
    const body = await send(
      legacy("initialize", { protocolVersion: MODERN_PROTOCOL_VERSION }),
    );

    expect((body.result as Body).protocolVersion).toBe("2025-11-25");
  });

  it("accepts the notification that follows a handshake", async () => {
    const response = await handleAppRequest(
      post({ jsonrpc: "2.0", method: "notifications/initialized" }),
      testWorkerEnv(),
    );

    expect(response.status).toBe(202);
  });

  it("answers the keepalive a legacy client sends", async () => {
    expect((await send(legacy("ping"))).status).toBe(200);
  });

  it("does not put the modern result fields in a legacy answer", async () => {
    const result = (await send(legacy("tools/list"))).result as Body;

    expect(result.tools).toEqual([]);
    expect(result).not.toHaveProperty("resultType");
    expect(result).not.toHaveProperty("ttlMs");
  });

  it("still refuses a declared version it does not speak", async () => {
    const body = await send(
      post(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: { _meta: { [PROTOCOL_VERSION_META]: "1900-01-01" } },
        },
        { "mcp-protocol-version": "1900-01-01", "mcp-method": "tools/list" },
      ),
    );

    expect(body.error).toMatchObject({ code: -32022 });
  });

  it("refuses a body that is not JSON at all", async () => {
    const response = await handleAppRequest(
      new Request(`https://${FAKE_APP_HOST}/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      }),
      testWorkerEnv(),
    );

    expect(response.status).toBe(400);
    expect(((await response.json()) as Body).error).toMatchObject({
      code: -32700,
    });
  });

  it("refuses a tool nobody has", async () => {
    const body = await send(
      post(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "coedit_nothing",
            _meta: { [PROTOCOL_VERSION_META]: MODERN_PROTOCOL_VERSION },
          },
        },
        {
          "mcp-protocol-version": MODERN_PROTOCOL_VERSION,
          "mcp-method": "tools/call",
          "mcp-name": "coedit_nothing",
        },
      ),
    );

    expect(body.error).toMatchObject({ code: -32602 });
  });
});
