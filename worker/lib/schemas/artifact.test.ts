import { describe, expect, it } from "vitest";
import {
  accessTokenSchema,
  MAX_ARTIFACT_BYTES,
  MAX_PASSWORD_LENGTH,
  unlockRequestSchema,
  uploadedArtifactSchema,
} from "./artifact";

describe("uploadedArtifactSchema", () => {
  it("accepts a .html file inside the size cap", () => {
    const parsed = uploadedArtifactSchema.safeParse({
      fileName: "deck.html",
      size: MAX_ARTIFACT_BYTES,
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts the .htm spelling", () => {
    expect(
      uploadedArtifactSchema.safeParse({ fileName: "deck.HTM", size: 10 })
        .success,
    ).toBe(true);
  });

  it("rejects a file one byte over the cap", () => {
    const parsed = uploadedArtifactSchema.safeParse({
      fileName: "deck.html",
      size: MAX_ARTIFACT_BYTES + 1,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toMatch(/larger than 5MB/);
  });

  it("rejects an empty file", () => {
    const parsed = uploadedArtifactSchema.safeParse({
      fileName: "deck.html",
      size: 0,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toMatch(/empty/);
  });

  it("rejects an extension that is not html", () => {
    expect(
      uploadedArtifactSchema.safeParse({ fileName: "deck.jsx", size: 10 })
        .success,
    ).toBe(false);
  });
});

describe("accessTokenSchema", () => {
  it("accepts a 32-character lowercase hex token", () => {
    expect(accessTokenSchema.safeParse("a".repeat(32)).success).toBe(true);
  });

  it("rejects the wrong length, uppercase, and non-hex", () => {
    expect(accessTokenSchema.safeParse("a".repeat(31)).success).toBe(false);
    expect(accessTokenSchema.safeParse("A".repeat(32)).success).toBe(false);
    expect(accessTokenSchema.safeParse("g".repeat(32)).success).toBe(false);
  });
});

describe("unlockRequestSchema", () => {
  it("accepts a password within the length cap", () => {
    expect(unlockRequestSchema.safeParse({ password: "hunter2" }).success).toBe(
      true,
    );
  });

  it("rejects an empty password and one past the cap", () => {
    expect(unlockRequestSchema.safeParse({ password: "" }).success).toBe(false);
    expect(
      unlockRequestSchema.safeParse({
        password: "x".repeat(MAX_PASSWORD_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it("rejects a missing password", () => {
    expect(unlockRequestSchema.safeParse({}).success).toBe(false);
  });
});
