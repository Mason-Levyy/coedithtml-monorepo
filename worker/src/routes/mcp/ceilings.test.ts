import { describe, expect, it } from "vitest";
import { FAKE_APP_HOST, testWorkerEnv } from "@/lib/fakes";
import {
  chargeMcpRead,
  chargeMcpUpload,
  MCP_READS_PER_TOKEN,
  MCP_UPLOADS_PER_IP,
} from "./ceilings";

function from(ip: string): Request {
  return new Request(`https://${FAKE_APP_HOST}/mcp`, {
    method: "POST",
    headers: { "cf-connecting-ip": ip },
  });
}

describe("the MCP ceilings", () => {
  it("lets an ordinary run of uploads through", async () => {
    const env = testWorkerEnv();
    const request = from("203.0.113.7");

    expect(await chargeMcpUpload(request, env)).toBeNull();
    expect(await chargeMcpUpload(request, env)).toBeNull();
  });

  it("stops an agent looping on uploads", async () => {
    const env = testWorkerEnv();
    const request = from("203.0.113.8");
    for (let attempt = 0; attempt < MCP_UPLOADS_PER_IP; attempt += 1) {
      await chargeMcpUpload(request, env);
    }

    expect(await chargeMcpUpload(request, env)).toContain("Too many uploads");
  });

  it("budgets each caller separately", async () => {
    const env = testWorkerEnv();
    const noisy = from("203.0.113.9");
    for (let attempt = 0; attempt < MCP_UPLOADS_PER_IP; attempt += 1) {
      await chargeMcpUpload(noisy, env);
    }

    expect(await chargeMcpUpload(noisy, env)).not.toBeNull();
    expect(await chargeMcpUpload(from("203.0.113.10"), env)).toBeNull();
  });

  it("stops a caller polling one artifact's feedback", async () => {
    const env = testWorkerEnv();
    const token = "e".repeat(32);
    for (let attempt = 0; attempt < MCP_READS_PER_TOKEN; attempt += 1) {
      await chargeMcpRead(token, env);
    }

    expect(await chargeMcpRead(token, env)).toContain("too many times");
    expect(await chargeMcpRead("f".repeat(32), env)).toBeNull();
  });
});
