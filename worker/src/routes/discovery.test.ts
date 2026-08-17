import { describe, expect, it } from "vitest";
import { testWorkerEnv } from "@/lib/fakes";
import { handleAppRequest } from "./app";
import type {
  buildAgentCard,
  buildApiCatalog,
  buildOAuthAuthorizationServer,
  buildOAuthProtectedResource,
} from "./discovery";
import {
  API_CATALOG_CONTENT_TYPE,
  AUTH_MD_DOCUMENT,
  handleAgentCard,
  handleApiCatalog,
  handleAuthMd,
  handleHealth,
  handleOAuthAuthorizationServer,
  handleOAuthProtectedResource,
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

  it("serves RFC 9728 OAuth Protected Resource Metadata", async () => {
    const request = new Request(
      "https://app.test:8787/.well-known/oauth-protected-resource",
    );
    const response = handleOAuthProtectedResource(request, env);

    expect(response.status).toBe(200);
    const data = (await response.json()) as ReturnType<
      typeof buildOAuthProtectedResource
    >;
    expect(data.resource).toBe("https://app.test:8787/api");
    expect(data.authorization_servers).toContain("https://coedithtml.com");
    expect(data.bearer_methods_supported).toContain("header");
    expect(data.scopes_supported).toContain("artifacts:create");
  });

  it("serves OAuth Authorization Server metadata with agent_auth block", async () => {
    const request = new Request(
      "https://app.test:8787/.well-known/oauth-authorization-server",
    );
    const response = handleOAuthAuthorizationServer(request, env);

    expect(response.status).toBe(200);
    const data = (await response.json()) as ReturnType<
      typeof buildOAuthAuthorizationServer
    >;
    expect(data.issuer).toBe("https://coedithtml.com");
    expect(data.agent_auth.skill).toContain("/auth.md");
    expect(data.agent_auth.register_uri).toBe(
      "https://app.test:8787/api/artifacts",
    );
    expect(data.agent_auth.identity_types_supported).toContain("anonymous");
    expect(data.agent_auth.identity_types_supported).toContain(
      "identity_assertion",
    );
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
        "/.well-known/oauth-protected-resource",
        "/.well-known/oauth-authorization-server",
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
