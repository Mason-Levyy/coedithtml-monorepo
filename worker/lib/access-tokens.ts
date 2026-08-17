import { z } from "zod";
import { TOKEN_KINDS } from "./room-capabilities";
import { accessTokenKey } from "./storage-keys";

// Every kind is optional because a record only ever carries the kinds at or
// below its own. A view token's record used to contain the edit token, filtered
// out on the way to the client -- one careless future handler away from being
// a privilege escalation. Now the escalation is not in the record to filter.
const siblingTokensSchema = z.object({
  view: z.string().optional(),
  suggest: z.string().optional(),
  edit: z.string().optional(),
});

export const tokenRecordSchema = z.object({
  artifactId: z.string(),
  kind: z.enum(TOKEN_KINDS),
  siblingTokens: siblingTokensSchema.optional(),
});

export type TokenRecord = z.infer<typeof tokenRecordSchema>;

export type PutTokenResult = { ok: true } | { ok: false; cause: unknown };

export async function putAccessToken(
  kv: KVNamespace,
  token: string,
  record: TokenRecord,
  options: { expirationTtl?: number } = {},
): Promise<PutTokenResult> {
  try {
    await kv.put(accessTokenKey(token), JSON.stringify(record), options);
    return { ok: true };
  } catch (cause) {
    return { ok: false, cause };
  }
}

export type ResolveTokenResult =
  { ok: true; record: TokenRecord | null } | { ok: false; cause: unknown };

export async function resolveAccessToken(
  kv: KVNamespace,
  token: string,
): Promise<ResolveTokenResult> {
  try {
    const raw = await kv.get(accessTokenKey(token));
    if (raw === null) {
      return { ok: true, record: null };
    }
    const parsed = tokenRecordSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return { ok: false, cause: parsed.error };
    }
    return { ok: true, record: parsed.data };
  } catch (cause) {
    return { ok: false, cause };
  }
}

export async function revokeAccessToken(
  kv: KVNamespace,
  token: string,
): Promise<PutTokenResult> {
  try {
    await kv.delete(accessTokenKey(token));
    return { ok: true };
  } catch (cause) {
    return { ok: false, cause };
  }
}
