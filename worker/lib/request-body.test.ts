import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseJsonBody } from "./request-body";

const schema = z.object({
  password: z.string().nullable().optional(),
});

function requestWithBody(body: string): Request {
  return new Request("https://app.test/x", { method: "POST", body });
}

describe("parseJsonBody", () => {
  it("parses a valid body against the schema", async () => {
    const result = await parseJsonBody(
      requestWithBody(JSON.stringify({ password: "secret" })),
      schema,
    );
    expect(result).toEqual({ ok: true, body: { password: "secret" } });
  });

  it("treats an empty body as an empty object", async () => {
    const result = await parseJsonBody(requestWithBody(""), schema);
    expect(result).toEqual({ ok: true, body: {} });
  });

  it("rejects malformed JSON", async () => {
    const result = await parseJsonBody(requestWithBody("{not json"), schema);
    expect(result).toEqual({ ok: false });
  });

  it("rejects a body that fails the schema", async () => {
    const result = await parseJsonBody(
      requestWithBody(JSON.stringify({ password: 12345 })),
      schema,
    );
    expect(result).toEqual({ ok: false });
  });
});
