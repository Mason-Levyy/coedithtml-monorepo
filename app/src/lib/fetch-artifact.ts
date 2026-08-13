import { z } from "zod";
import { readErrorMessage } from "@/lib/api-error";

const unavailable = "Could not load the file. Try again.";

const lockedSchema = z.object({ requiresPassword: z.literal(true) });

const shareLinksSchema = z.object({
  view: z.string().optional(),
  suggest: z.string().optional(),
  edit: z.string().optional(),
});

const unlockedSchema = z.object({
  requiresPassword: z.literal(false),
  artifactId: z.string(),
  fileName: z.string(),
  size: z.number(),
  uploadedAt: z.string(),
  revision: z.string(),
  sandboxOrigin: z.string(),
  artifactUrl: z.string(),
  shareLinks: shareLinksSchema,
});

const artifactSchema = z.union([lockedSchema, unlockedSchema]);

export type Artifact = z.infer<typeof artifactSchema>;
export type UnlockedArtifact = z.infer<typeof unlockedSchema>;

function artifactPath(token: string, suffix = ""): string {
  return `/api/artifacts/${encodeURIComponent(token)}${suffix}`;
}

async function parseArtifact(response: Response): Promise<Artifact> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, unavailable));
  }
  const parsed = artifactSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("The server returned an unexpected response.");
  }
  return parsed.data;
}

export async function fetchArtifact(token: string): Promise<Artifact> {
  return parseArtifact(await fetch(artifactPath(token)));
}

export async function unlockArtifact(
  token: string,
  password: string,
): Promise<Artifact> {
  return parseArtifact(
    await fetch(artifactPath(token, "/unlock"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    }),
  );
}
