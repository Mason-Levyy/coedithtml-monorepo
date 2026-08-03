import { describe, expect, it } from "vitest";
import { FAKE_APP_HOST, stubAssets, testWorkerEnv } from "@/lib/fakes";
import { handleAppRequest } from "./app";

const INDEX_HTML = "<!doctype html><title>Coedit</title>";

function envWithApp() {
  return testWorkerEnv({
    ASSETS: stubAssets([
      { path: "/index.html", body: INDEX_HTML, contentType: "text/html" },
      { path: "/assets/main.js", body: "console.log(1)" },
      { path: "/runtime.js", body: "/* runtime */" },
    ]),
  });
}

function get(path: string): Request {
  return new Request(`https://${FAKE_APP_HOST}${path}`);
}

describe("handleAppRequest asset serving", () => {
  it("serves the app shell at the landing page", async () => {
    const response = await handleAppRequest(get("/"), envWithApp());
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(INDEX_HTML);
  });

  it("serves the app shell for a viewer route so the SPA can pick up the token", async () => {
    const response = await handleAppRequest(
      get(`/a/${"a".repeat(32)}`),
      envWithApp(),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(INDEX_HTML);
  });

  it("serves a real asset as itself", async () => {
    const response = await handleAppRequest(
      get("/assets/main.js"),
      envWithApp(),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("console.log(1)");
  });

  it("404s a missing asset instead of answering it with the app shell", async () => {
    const response = await handleAppRequest(
      get("/assets/gone.js"),
      envWithApp(),
    );
    expect(response.status).toBe(404);
  });

  it("does not serve the runtime bundle from the app origin", async () => {
    const response = await handleAppRequest(get("/runtime.js"), envWithApp());
    expect(response.status).toBe(404);
  });

  it("404s an unknown API path as JSON rather than the app shell", async () => {
    const response = await handleAppRequest(get("/api/nope"), envWithApp());
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("rejects a write method on a document route", async () => {
    const response = await handleAppRequest(
      new Request(`https://${FAKE_APP_HOST}/`, { method: "DELETE" }),
      envWithApp(),
    );
    expect(response.status).toBe(405);
  });
});
