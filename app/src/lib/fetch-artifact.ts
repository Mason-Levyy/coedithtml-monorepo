import { z } from "zod";
import { readErrorMessage } from "@/lib/api-error";

const artifactSchema = z.object({
  artifactId: z.string(),
  fileName: z.string(),
  size: z.number(),
  uploadedAt: z.string(),
  sandboxOrigin: z.string(),
  artifactUrl: z.string(),
});

export type Artifact = z.infer<typeof artifactSchema>;

export async function fetchArtifact(token: string): Promise<Artifact> {
  const response = await fetch(`/api/artifacts/${encodeURIComponent(token)}`);

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Could not load the file. Try again."),
    );
  }

  const parsed = artifactSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error("The server returned an unexpected response.");
  }
  return parsed.data;
}
