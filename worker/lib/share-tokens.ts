import { putAccessToken, revokeAccessToken } from "@/lib/access-tokens";
import type { WorkerEnv } from "@/lib/env";
import { jsonError } from "@/lib/responses";
import {
  siblingsVisibleTo,
  TOKEN_FIELD,
  TOKEN_KINDS,
  type SiblingTokens,
  type TokenKind,
} from "@/lib/room-capabilities";
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
  const allTokens: SiblingTokens = {
    view: tokens.viewToken,
    suggest: tokens.suggestToken,
    edit: tokens.editToken,
  };
  const results = await Promise.all(
    TOKEN_KINDS.map((kind) =>
      putAccessToken(
        env.ARTIFACT_METADATA,
        allTokens[kind] ?? "",
        {
          artifactId,
          kind,
          siblingTokens: siblingsVisibleTo(kind, allTokens),
        },
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

export type RegeneratedLink =
  | { ok: true; tokens: Partial<ShareTokens>; token: string }
  | { ok: false; response: Response };

export async function regenerateShareToken(
  env: WorkerEnv,
  artifactId: string,
  kind: TokenKind,
  currentTokens: Partial<ShareTokens>,
): Promise<RegeneratedLink> {
  const freshToken = newToken();
  const updatedTokens: Partial<ShareTokens> = {
    ...currentTokens,
    [TOKEN_FIELD[kind]]: freshToken,
  };

  const allTokens: SiblingTokens = {
    view: updatedTokens.viewToken,
    suggest: updatedTokens.suggestToken,
    edit: updatedTokens.editToken,
  };

  const results = await Promise.all(
    TOKEN_KINDS.map((k) => {
      const token = updatedTokens[TOKEN_FIELD[k]];
      if (!token) {
        return Promise.resolve({ ok: true as const });
      }
      return putAccessToken(env.ARTIFACT_METADATA, token, {
        artifactId,
        kind: k,
        siblingTokens: siblingsVisibleTo(k, allTokens),
      });
    }),
  );
  const failed = results.find((result) => !result.ok);
  if (failed && !failed.ok) {
    console.error("Failed to store access tokens", failed.cause);
    return { ok: false, response: jsonError(SAVE_FAILED, 500) };
  }

  const oldToken = currentTokens[TOKEN_FIELD[kind]];
  if (oldToken) {
    const revoked = await revokeAccessToken(env.ARTIFACT_METADATA, oldToken);
    if (!revoked.ok) {
      console.error("Failed to revoke the old access token", revoked.cause);
      return { ok: false, response: jsonError(SAVE_FAILED, 500) };
    }
  }

  return { ok: true, tokens: updatedTokens, token: freshToken };
}
