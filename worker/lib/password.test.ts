import { describe, expect, it } from "vitest";
import {
  hashArtifactPassword,
  nextPasswordHash,
  verifyArtifactPassword,
} from "./password";

describe("hashArtifactPassword", () => {
  it("stays within the Workers PBKDF2 iteration limit", async () => {
    const hash = await hashArtifactPassword("hunter2");
    const [, iterations] = hash.split("$");

    expect(Number(iterations)).toBeLessThanOrEqual(100_000);
  });

  it("verifies the password it hashed and refuses another", async () => {
    const hash = await hashArtifactPassword("hunter2");

    await expect(verifyArtifactPassword("hunter2", hash)).resolves.toBe(true);
    await expect(verifyArtifactPassword("hunter3", hash)).resolves.toBe(false);
  });
});

describe("verifyArtifactPassword", () => {
  it("refuses a hash whose iteration count Workers cannot run", async () => {
    const result = await verifyArtifactPassword(
      "hunter2",
      "pbkdf2$600000$abcd$ef01",
    );

    expect(result).toBe(false);
  });
});

describe("nextPasswordHash", () => {
  it("sets a new password as a verifiable hash", async () => {
    const hash = await nextPasswordHash(undefined, "hunter2");
    if (hash === undefined) throw new Error("expected a hash");

    await expect(verifyArtifactPassword("hunter2", hash)).resolves.toBe(true);
  });
});
