import { describe, expect, it } from "vitest";
import { liveKv } from "./fakes";
import {
  addOwnerArtifact,
  listOwnerArtifacts,
  removeOwnerArtifact,
  updateOwnerArtifact,
  type OwnerArtifactItem,
} from "./owner-artifacts";

describe("owner-artifacts", () => {
  it("returns empty array for unknown owner", async () => {
    const kv = liveKv();
    const items = await listOwnerArtifacts(kv, "owner1");
    expect(items).toEqual([]);
  });

  it("adds and lists owner artifacts in LIFO order", async () => {
    const kv = liveKv();
    const item1: OwnerArtifactItem = {
      artifactId: "art1",
      fileName: "test1.html",
      size: 100,
      uploadedAt: new Date().toISOString(),
      published: false,
      hasPassword: false,
    };
    const item2: OwnerArtifactItem = {
      artifactId: "art2",
      fileName: "test2.html",
      size: 200,
      uploadedAt: new Date().toISOString(),
      published: true,
      hasPassword: true,
      viewToken: "tok_view",
    };

    await addOwnerArtifact(kv, "owner1", item1);
    await addOwnerArtifact(kv, "owner1", item2);

    const list = await listOwnerArtifacts(kv, "owner1");
    expect(list).toHaveLength(2);
    expect(list[0]?.artifactId).toBe("art2");
    expect(list[1]?.artifactId).toBe("art1");
  });

  it("updates an existing owner artifact", async () => {
    const kv = liveKv();
    const item1: OwnerArtifactItem = {
      artifactId: "art1",
      fileName: "test1.html",
      size: 100,
      uploadedAt: new Date().toISOString(),
      published: false,
      hasPassword: false,
    };

    await addOwnerArtifact(kv, "owner1", item1);
    await updateOwnerArtifact(kv, "owner1", "art1", {
      published: true,
      hasPassword: true,
      viewToken: "new_view_tok",
    });

    const list = await listOwnerArtifacts(kv, "owner1");
    expect(list[0]?.published).toBe(true);
    expect(list[0]?.hasPassword).toBe(true);
    expect(list[0]?.viewToken).toBe("new_view_tok");
  });

  it("removes an owner artifact", async () => {
    const kv = liveKv();
    const item1: OwnerArtifactItem = {
      artifactId: "art1",
      fileName: "test1.html",
      size: 100,
      uploadedAt: new Date().toISOString(),
      published: false,
      hasPassword: false,
    };

    await addOwnerArtifact(kv, "owner1", item1);
    expect(await listOwnerArtifacts(kv, "owner1")).toHaveLength(1);

    await removeOwnerArtifact(kv, "owner1", "art1");
    expect(await listOwnerArtifacts(kv, "owner1")).toHaveLength(0);
  });
});
