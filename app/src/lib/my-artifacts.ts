import { z } from "zod";
import { LINK_PERMISSIONS, type LinkPermission } from "@/lib/link-permission";
import { requestJson } from "./api-error";

export const myArtifactItemSchema = z.object({
  artifactId: z.string(),
  fileName: z.string(),
  size: z.number(),
  uploadedAt: z.string(),
  published: z.boolean(),
  hasPassword: z.boolean(),
  viewToken: z.string().optional(),
  suggestToken: z.string().optional(),
  editToken: z.string().optional(),
  viewUrl: z.string().optional(),
  suggestUrl: z.string().optional(),
  editUrl: z.string().optional(),
});

export type MyArtifactItem = z.infer<typeof myArtifactItemSchema>;

const myArtifactsResponseSchema = z.object({
  artifacts: z.array(myArtifactItemSchema),
});

const publishResponseSchema = z.object({
  artifactId: z.string(),
  viewToken: z.string(),
  suggestToken: z.string(),
  editToken: z.string(),
  viewUrl: z.string(),
  suggestUrl: z.string(),
  editUrl: z.string(),
  published: z.boolean(),
  hasPassword: z.boolean(),
});

export type PublishResult = z.infer<typeof publishResponseSchema>;

const updatedSettingsSchema = z.object({
  updated: z.boolean(),
  hasPassword: z.boolean(),
});

const deletedSchema = z.object({ deleted: z.boolean() });

const revokedSchema = z.object({ revoked: z.boolean() });

const regeneratedLinkSchema = z.object({
  kind: z.enum(LINK_PERMISSIONS),
  token: z.string(),
  url: z.string(),
});

export type RegeneratedLink = z.infer<typeof regeneratedLinkSchema>;

const JSON_HEADERS = { "Content-Type": "application/json" };

export async function fetchMyArtifacts(): Promise<MyArtifactItem[]> {
  const { artifacts } = await requestJson("/api/my-artifacts", {
    schema: myArtifactsResponseSchema,
    fallbackError: "Could not load your files.",
  });
  return artifacts;
}

export async function publishArtifact(
  artifactId: string,
  input: { password?: string | null } = {},
): Promise<PublishResult> {
  return requestJson(`/api/artifacts/${artifactId}/publish`, {
    schema: publishResponseSchema,
    fallbackError: "Could not publish your file.",
    init: {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    },
  });
}

export async function updateArtifactSettings(
  artifactId: string,
  settings: { password?: string | null },
): Promise<z.infer<typeof updatedSettingsSchema>> {
  return requestJson(`/api/artifacts/${artifactId}/settings`, {
    schema: updatedSettingsSchema,
    fallbackError: "Could not update file settings.",
    init: {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(settings),
    },
  });
}

export async function deleteArtifact(artifactId: string): Promise<boolean> {
  const { deleted } = await requestJson(`/api/my-artifacts/${artifactId}`, {
    schema: deletedSchema,
    fallbackError: "Could not delete file.",
    init: { method: "DELETE" },
  });
  return deleted;
}

export async function revokeLinkToken(token: string): Promise<boolean> {
  const { revoked } = await requestJson(`/api/artifacts/${token}`, {
    schema: revokedSchema,
    fallbackError: "Could not revoke link.",
    init: { method: "DELETE" },
  });
  return revoked;
}

export async function regenerateLink(
  artifactId: string,
  kind: LinkPermission,
): Promise<RegeneratedLink> {
  return requestJson(`/api/artifacts/${artifactId}/links/${kind}/regenerate`, {
    schema: regeneratedLinkSchema,
    fallbackError: "Could not regenerate the link.",
    init: { method: "POST" },
  });
}
