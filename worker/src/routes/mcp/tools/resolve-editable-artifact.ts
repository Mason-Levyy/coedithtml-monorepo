import type { WorkerEnv } from "@/lib/env";
import {
  resolveArtifactByToken,
  type ResolvedArtifact,
} from "@/lib/resolve-artifact";

export type ResolvedEditableArtifact =
  { ok: true; artifact: ResolvedArtifact } | { ok: false; message: string };

export async function resolveEditableArtifact(
  env: WorkerEnv,
  editToken: string,
): Promise<ResolvedEditableArtifact> {
  const resolved = await resolveArtifactByToken(
    env.ARTIFACT_METADATA,
    editToken,
  );
  if (!resolved.ok) {
    return {
      ok: false,
      message:
        "That link is gone or the token is wrong. Check it and try again.",
    };
  }
  if (resolved.artifact.record.kind !== "edit") {
    return {
      ok: false,
      message: "That link cannot replace the file. Only an edit link may.",
    };
  }
  return { ok: true, artifact: resolved.artifact };
}
