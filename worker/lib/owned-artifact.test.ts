import { describe, expect, it } from "vitest";
import type { ArtifactMetadata } from "@/lib/artifact-metadata";
import { FAKE_APP_HOST } from "@/lib/fakes";
import { ownsArtifact } from "@/lib/owned-artifact";

const OWNER = "a".repeat(32);
const SOMEONE_ELSE = "b".repeat(32);

function artifact(ownerId?: string): ArtifactMetadata {
  return {
    fileName: "deck.html",
    size: 1024,
    uploadedAt: "2026-08-16T09:00:00.000Z",
    revision: "aaaa1111bbbb2222",
    previousRevisions: [],
    blobs: {},
    meaningfulViews: 0,
    published: true,
    ownerId,
  };
}

function requestFrom(ownerId: string | null): Request {
  return new Request(`https://${FAKE_APP_HOST}/api/my-artifacts/x`, {
    method: "DELETE",
    headers:
      ownerId === null ? {} : { cookie: `__Host-coedit_owner=${ownerId}` },
  });
}

describe("who may manage an artifact", () => {
  it("lets the owner through", () => {
    expect(ownsArtifact(artifact(OWNER), requestFrom(OWNER))).toBe(true);
  });

  it("keeps somebody else's cookie out", () => {
    expect(ownsArtifact(artifact(OWNER), requestFrom(SOMEONE_ELSE))).toBe(
      false,
    );
  });

  it("keeps out a reader carrying no cookie at all", () => {
    expect(ownsArtifact(artifact(OWNER), requestFrom(null))).toBe(false);
  });

  it("gives an artifact with no recorded owner to nobody, not to everybody", () => {
    expect(ownsArtifact(artifact(undefined), requestFrom(OWNER))).toBe(false);
    expect(ownsArtifact(artifact(undefined), requestFrom(null))).toBe(false);
    expect(ownsArtifact(artifact(""), requestFrom(""))).toBe(false);
  });
});
