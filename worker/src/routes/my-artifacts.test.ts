import { describe, expect, it } from "vitest";
import { liveKv, testWorkerEnv } from "@/lib/fakes";
import { addOwnerArtifact } from "@/lib/owner-artifacts";
import { handleListMyArtifacts } from "./my-artifacts";

const OWNER_ID = "a".repeat(32);

describe("handleListMyArtifacts", () => {
  it("returns empty array when no cookie is present", async () => {
    const kv = liveKv();
    const env = testWorkerEnv({ ARTIFACT_METADATA: kv });
    const request = new Request("https://app.test/api/my-artifacts");

    const response = await handleListMyArtifacts(request, env);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { artifacts: unknown[] };
    expect(body.artifacts).toEqual([]);
  });

  it("returns list of owner artifacts with URLs", async () => {
    const kv = liveKv();
    const env = testWorkerEnv({ ARTIFACT_METADATA: kv });
    const viewToken = "v".repeat(32);

    await addOwnerArtifact(kv, OWNER_ID, {
      artifactId: "art1",
      fileName: "deck.html",
      size: 1024,
      uploadedAt: new Date().toISOString(),
      published: true,
      hasPassword: false,
      viewToken,
    });

    const request = new Request("https://app.test/api/my-artifacts", {
      headers: { cookie: `__Host-coedit_owner=${OWNER_ID}` },
    });

    const response = await handleListMyArtifacts(request, env);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      artifacts: Array<{
        artifactId: string;
        fileName: string;
        viewUrl?: string;
      }>;
    };
    expect(body.artifacts).toHaveLength(1);
    expect(body.artifacts[0]?.fileName).toBe("deck.html");
    expect(body.artifacts[0]?.viewUrl).toContain(viewToken);
  });
});
