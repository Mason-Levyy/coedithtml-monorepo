import { describe, expect, it } from "vitest";
import { isValidOwnerId } from "@/lib/owner-cookie";
import {
  ownerIdFromWorkspaceKey,
  resolveWorkspace,
  workspaceKeyFor,
} from "./workspace-key";

const SECRET = "a".repeat(48);
const OTHER_SECRET = "b".repeat(48);
const OWNER = "c".repeat(32);

describe("the workspace key", () => {
  it("recognises a key it signed itself", async () => {
    const key = await workspaceKeyFor(OWNER, SECRET);

    expect(await ownerIdFromWorkspaceKey(key, SECRET)).toBe(OWNER);
  });

  it("refuses a key signed with a different secret", async () => {
    const key = await workspaceKeyFor(OWNER, OTHER_SECRET);

    expect(await ownerIdFromWorkspaceKey(key, SECRET)).toBeNull();
  });

  it("refuses an owner id offered without a signature", async () => {
    expect(await ownerIdFromWorkspaceKey(OWNER, SECRET)).toBeNull();
    expect(await ownerIdFromWorkspaceKey(`${OWNER}.`, SECRET)).toBeNull();
  });

  it("refuses a signature attached to somebody else's owner id", async () => {
    const key = await workspaceKeyFor(OWNER, SECRET);
    const forged = `${"d".repeat(32)}${key.slice(32)}`;

    expect(await ownerIdFromWorkspaceKey(forged, SECRET)).toBeNull();
  });

  it("refuses anything that is not a string", async () => {
    expect(await ownerIdFromWorkspaceKey(undefined, SECRET)).toBeNull();
    expect(await ownerIdFromWorkspaceKey(42, SECRET)).toBeNull();
  });

  it("mints a workspace for a caller who arrives without one", async () => {
    const first = await resolveWorkspace(undefined, SECRET);

    expect(isValidOwnerId(first.ownerId)).toBe(true);
    expect(await ownerIdFromWorkspaceKey(first.workspaceKey, SECRET)).toBe(
      first.ownerId,
    );
  });

  it("keeps a caller on the workspace they came back with", async () => {
    const first = await resolveWorkspace(undefined, SECRET);
    const second = await resolveWorkspace(first.workspaceKey, SECRET);

    expect(second.ownerId).toBe(first.ownerId);
    expect(second.workspaceKey).toBe(first.workspaceKey);
  });

  it("does not honour a key it cannot verify, and starts a fresh workspace", async () => {
    const stolen = await resolveWorkspace("not-a-key", SECRET);

    expect(isValidOwnerId(stolen.ownerId)).toBe(true);
    expect(stolen.workspaceKey).not.toBe("not-a-key");
  });
});
