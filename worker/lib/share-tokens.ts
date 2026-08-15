import { putAccessToken } from "@/lib/access-tokens";
import type { WorkerEnv } from "@/lib/env";
import { jsonError } from "@/lib/responses";
import { newToken } from "@/lib/storage-keys";

export const SAVE_FAILED = "Could not save the file. Try again.";

export type ShareTokens = {
  viewToken: string;
  suggestToken: string;
  editToken: string;
};

export type MintedTokens =
  { ok: true; tokens: ShareTokens } | { ok: false; response: Response };

export async function mintShareTokens(
  env: WorkerEnv,
  artifactId: string,
  options: { expirationTtl?: number } = {},
): Promise<MintedTokens> {
  const tokens: ShareTokens = {
    viewToken: newToken(),
    suggestToken: newToken(),
    editToken: newToken(),
  };
  const siblingTokens = {
    view: tokens.viewToken,
    suggest: tokens.suggestToken,
    edit: tokens.editToken,
  };
  const results = await Promise.all(
    (["view", "suggest", "edit"] as const).map((kind) =>
      putAccessToken(
        env.ARTIFACT_METADATA,
        siblingTokens[kind],
        { artifactId, kind, siblingTokens },
        options,
      ),
    ),
  );

  const failed = results.find((result) => !result.ok);
  if (failed && !failed.ok) {
    console.error("Failed to store access tokens", failed.cause);
    return { ok: false, response: jsonError(SAVE_FAILED, 500) };
  }
  return { ok: true, tokens };
}
