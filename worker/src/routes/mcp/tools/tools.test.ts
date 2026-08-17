import { describe, expect, it } from "vitest";
import {
  FAKE_APP_HOST,
  liveArtifactStore,
  liveKv,
  testWorkerEnv,
} from "@/lib/fakes";
import type { WorkerEnv } from "@/lib/env";
import { MCP_MAX_ARTIFACT_BYTES } from "../ceilings";
import { readFeedbackTool } from "./feedback";
import { shareArtifactTool } from "./share";
import { updateArtifactTool } from "./update";

const ARTIFACT =
  "<!doctype html><html><body><p>Revenue grew 18%</p></body></html>";

let caller = 0;

function liveEnv(overrides: Record<string, unknown> = {}): WorkerEnv {
  return testWorkerEnv({
    ARTIFACT_METADATA: liveKv(),
    ARTIFACT_STORE: liveArtifactStore(),
    ...overrides,
  });
}

function context(env: WorkerEnv = liveEnv()) {
  caller += 1;
  return {
    request: new Request(`https://${FAKE_APP_HOST}/mcp`, {
      method: "POST",
      headers: { "cf-connecting-ip": `203.0.113.${caller}` },
    }),
    env,
  };
}

function textOf(result: { content: { text: string }[] }): string {
  return result.content[0]?.text ?? "";
}

async function share(
  args: Record<string, unknown> = {},
  ctx = context(),
): Promise<{
  text: string;
  isError: boolean;
  ctx: ReturnType<typeof context>;
}> {
  const result = await shareArtifactTool.run(
    { html: ARTIFACT, fileName: "q3-review.html", ...args },
    ctx,
  );
  return { text: textOf(result), isError: result.isError === true, ctx };
}

describe("coedit_share_artifact", () => {
  it("puts a file up and hands back a link and the tokens to keep", async () => {
    const shared = await share();
    const body = JSON.parse(shared.text) as Record<string, string>;

    expect(shared.isError).toBe(false);
    expect(body.shareUrl).toContain("http");
    expect(body.editToken).toMatch(/^[0-9a-f]{32}$/);
    expect(body.workspaceKey).toContain(".");
    expect(body.permission).toBe("suggest");
  });

  it("hands back the link for the permission that was asked for", async () => {
    const suggested = JSON.parse((await share()).text) as Record<
      string,
      string
    >;
    const viewing = JSON.parse(
      (await share({ permission: "view" })).text,
    ) as Record<string, string>;

    expect(viewing.shareUrl).not.toBe(suggested.shareUrl);
    expect(viewing.permission).toBe("view");
  });

  it("keeps a caller's files together when they bring their key back", async () => {
    const first = JSON.parse((await share()).text) as Record<string, string>;
    const second = JSON.parse(
      (await share({ workspaceKey: first.workspaceKey })).text,
    ) as Record<string, string>;

    expect(second.workspaceKey).toBe(first.workspaceKey);
  });

  it("refuses a file bigger than a tool call should carry", async () => {
    const huge = `<html><body>${"x".repeat(MCP_MAX_ARTIFACT_BYTES)}</body></html>`;
    const shared = await share({ html: huge });

    expect(shared.isError).toBe(true);
    expect(shared.text).toContain("over 1MB");
  });

  it("explains itself when the model sends something that is not a document", async () => {
    const shared = await share({ html: "const App = () => <div/>;" });

    expect(shared.isError).toBe(true);
    expect(shared.text.length).toBeGreaterThan(0);
  });

  it("will not run without the secret that signs workspace keys", async () => {
    const shared = await share(
      {},
      context(liveEnv({ MCP_SIGNING_SECRET: undefined })),
    );

    expect(shared.isError).toBe(true);
  });
});

describe("coedit_read_feedback", () => {
  it("says so plainly when nobody has left anything", async () => {
    const shared = await share();
    const { editToken } = JSON.parse(shared.text) as Record<string, string>;

    const result = await readFeedbackTool.run({ token: editToken }, shared.ctx);

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("Nobody has left anything");
  });

  it("refuses something that is not a token at all", async () => {
    const result = await readFeedbackTool.run({ token: "nope" }, context());

    expect(result.isError).toBe(true);
  });

  it("refuses a token for an artifact that is not there", async () => {
    const result = await readFeedbackTool.run(
      { token: "a".repeat(32) },
      context(),
    );

    expect(result.isError).toBe(true);
  });
});

describe("coedit_update_artifact", () => {
  it("replaces the file behind a link that people already hold", async () => {
    const shared = await share();
    const { editToken, shareUrl } = JSON.parse(shared.text) as Record<
      string,
      string
    >;

    const result = await updateArtifactTool.run(
      {
        editToken,
        html: "<!doctype html><html><body><p>Revenue fell 4%</p></body></html>",
        fileName: "q3-review.html",
      },
      shared.ctx,
    );
    const body = JSON.parse(textOf(result)) as Record<string, string>;

    expect(result.isError).toBeUndefined();
    expect(body.revision).toEqual(expect.any(String));
    expect(shareUrl).toContain("http");
  });

  it("refuses a view token, because only an edit link may replace a file", async () => {
    const shared = await share({ permission: "view" });
    const { shareUrl } = JSON.parse(shared.text) as Record<string, string>;
    const viewToken = (shareUrl ?? "").split("/").pop() ?? "";

    const result = await updateArtifactTool.run(
      { editToken: viewToken, html: ARTIFACT, fileName: "q3-review.html" },
      shared.ctx,
    );

    expect(result.isError).toBe(true);
  });
});
