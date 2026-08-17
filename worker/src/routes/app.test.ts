import { describe, expect, it } from "vitest";
import {
  FAKE_APP_HOST,
  FAKE_SANDBOX_HOST,
  stubAssets,
  testWorkerEnv,
} from "@/lib/fakes";
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

  it("tells crawlers to skip a viewer page, since its URL carries a share token", async () => {
    const response = await handleAppRequest(
      get(`/a/${"a".repeat(32)}`),
      envWithApp(),
    );
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
  });

  it("leaves the landing page indexable", async () => {
    const response = await handleAppRequest(get("/"), envWithApp());
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });

  it("guards the page that holds the owner cookie and the revoke button", async () => {
    const response = await handleAppRequest(get("/"), envWithApp());
    const policy = response.headers.get("content-security-policy") ?? "";

    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain(`frame-src https://${FAKE_SANDBOX_HOST}`);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("guards a 404 as carefully as a page", async () => {
    const response = await handleAppRequest(
      get("/assets/gone.js"),
      envWithApp(),
    );

    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("rejects a write method on a document route", async () => {
    const response = await handleAppRequest(
      new Request(`https://${FAKE_APP_HOST}/`, { method: "DELETE" }),
      envWithApp(),
    );
    expect(response.status).toBe(405);
  });
});

describe("writes arriving from another origin", () => {
  function write(method: string, path: string, origin: string | null): Request {
    return new Request(`https://${FAKE_APP_HOST}${path}`, {
      method,
      headers: origin === null ? {} : { origin },
    });
  }

  const FROM_SANDBOX = `https://${FAKE_SANDBOX_HOST}`;

  it("refuses an upload driven by a script inside an artifact", async () => {
    const response = await handleAppRequest(
      write("POST", "/api/artifacts", FROM_SANDBOX),
      envWithApp(),
    );

    expect(response.status).toBe(403);
  });

  it("refuses a delete, whatever else the request carries", async () => {
    const response = await handleAppRequest(
      write("DELETE", `/api/my-artifacts/${"a".repeat(32)}`, FROM_SANDBOX),
      envWithApp(),
    );

    expect(response.status).toBe(403);
  });

  // Multipart form data is sent without a preflight, which is what made this
  // the one state-changing route any origin could fire.
  it("refuses a replacement upload posted from anywhere else", async () => {
    const response = await handleAppRequest(
      write("POST", `/api/artifacts/${"a".repeat(32)}/revisions`, FROM_SANDBOX),
      envWithApp(),
    );

    expect(response.status).toBe(403);
  });

  it("leaves reading alone, since the artifact frame has to read", async () => {
    const response = await handleAppRequest(
      write("GET", "/api/nope", FROM_SANDBOX),
      envWithApp(),
    );

    expect(response.status).toBe(404);
  });

  it("lets the app's own origin write", async () => {
    const response = await handleAppRequest(
      write("PUT", "/api/artifacts", `https://${FAKE_APP_HOST}`),
      envWithApp(),
    );

    expect(response.status).toBe(405);
  });
});
