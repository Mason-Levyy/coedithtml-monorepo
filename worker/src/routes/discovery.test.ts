import { describe, expect, it } from "vitest";
import { stubAssets, testWorkerEnv } from "@/lib/fakes";
import { handleAppRequest } from "./app";
import type { buildAgentCard, buildApiCatalog } from "./discovery";
import {
  API_CATALOG_CONTENT_TYPE,
  AUTH_MD_DOCUMENT,
  handleAgentCard,
  handleApiCatalog,
  handleAuthMd,
  handleHealth,
} from "./discovery";

describe("discovery endpoints & agent readiness", () => {
  const env = testWorkerEnv();

  it("serves RFC 9727 API catalog with application/linkset+json", async () => {
    const request = new Request(
      "https://app.test:8787/.well-known/api-catalog",
    );
    const response = handleApiCatalog(request, env);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(API_CATALOG_CONTENT_TYPE);

    const data = (await response.json()) as ReturnType<typeof buildApiCatalog>;
    expect(Array.isArray(data.linkset)).toBe(true);
    expect(data.linkset[0]?.anchor).toBe("https://app.test:8787/api");
    expect(data.linkset[0]?.["service-desc"]?.[0]?.href).toContain(
      "openapi.json",
    );
    expect(data.linkset[0]?.["service-doc"]?.[0]?.href).toContain("llms.txt");
    expect(data.linkset[0]?.status?.[0]?.href).toBe(
      "https://app.test:8787/api/health",
    );
  });

  it("serves A2A agent card specification", async () => {
    const request = new Request(
      "https://app.test:8787/.well-known/agent-card.json",
    );
    const response = handleAgentCard(request, env);

    expect(response.status).toBe(200);
    const data = (await response.json()) as ReturnType<typeof buildAgentCard>;
    expect(data.name).toBe("coeditHTML");
    expect(data.version).toBe("1.0.0");
    expect(data.supportedInterfaces[0]?.url).toBe("https://app.test:8787/api");
    expect(data.capabilities.streaming).toBe(true);
    expect(data.skills.map((s) => s.id)).toContain("publish_artifact");
    expect(data.skills.map((s) => s.id)).toContain("get_artifact");
  });

  it("does not advertise an OAuth authorization server it does not run", async () => {
    const serving = testWorkerEnv({
      ASSETS: stubAssets([
        {
          path: "/index.html",
          body: "<!doctype html><title>coeditHTML</title>",
          contentType: "text/html",
        },
      ]),
    });

    for (const path of [
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-authorization-server",
      "/.well-known/anything-else",
    ]) {
      const response = await handleAppRequest(
        new Request(`https://app.test:8787${path}`),
        serving,
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).not.toContain("text/html");
    }
  });

  it("still serves the app shell outside the reserved namespace", async () => {
    const serving = testWorkerEnv({
      ASSETS: stubAssets([
        {
          path: "/index.html",
          body: "<!doctype html><title>coeditHTML</title>",
          contentType: "text/html",
        },
      ]),
    });

    const response = await handleAppRequest(
      new Request(`https://app.test:8787/a/${"a".repeat(32)}`),
      serving,
    );

    expect(response.status).toBe(200);
  });

  it("serves /auth.md as markdown with required H1 and token count", async () => {
    const response = handleAuthMd();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("x-markdown-tokens")).toBeTruthy();

    const text = await response.text();
    expect(text.startsWith("# coeditHTML auth.md")).toBe(true);
    expect(text).toBe(AUTH_MD_DOCUMENT);
  });

  it("serves health status at /api/health", async () => {
    const response = handleHealth();
    expect(response.status).toBe(200);
    const data = (await response.json()) as { status: string; service: string };
    expect(data.status).toBe("ok");
    expect(data.service).toBe("coedit-worker");
  });

  describe("router integration via handleAppRequest", () => {
    it("routes .well-known and auth.md paths correctly", async () => {
      const paths = [
        "/.well-known/api-catalog",
        "/.well-known/agent-card.json",
        "/auth.md",
        "/api/health",
      ];

      for (const path of paths) {
        const response = await handleAppRequest(
          new Request(`https://app.test:8787${path}`),
          env,
        );
        expect(response.status).toBe(200);
      }
    });

    it("handles Accept: text/markdown negotiation on / and /tutorial", async () => {
      const homeMarkdown = await handleAppRequest(
        new Request("https://app.test:8787/", {
          headers: { accept: "text/markdown" },
        }),
        env,
      );
      expect(homeMarkdown.status).toBe(200);
      expect(homeMarkdown.headers.get("content-type")).toContain(
        "text/markdown",
      );
      expect(homeMarkdown.headers.get("x-markdown-tokens")).toBeTruthy();
      expect(await homeMarkdown.text()).toContain("# coeditHTML App");

      const tutorialMarkdown = await handleAppRequest(
        new Request("https://app.test:8787/tutorial", {
          headers: { accept: "text/markdown" },
        }),
        env,
      );
      expect(tutorialMarkdown.status).toBe(200);
      expect(tutorialMarkdown.headers.get("content-type")).toContain(
        "text/markdown",
      );
      expect(tutorialMarkdown.headers.get("x-markdown-tokens")).toBeTruthy();
      expect(await tutorialMarkdown.text()).toContain(
        "# coeditHTML Interactive Tutorial",
      );
    });
  });
});
