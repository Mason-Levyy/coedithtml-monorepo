import { z } from "zod";
import { TOKEN_KINDS } from "./room-capabilities";
import { accessTokenKey } from "./storage-keys";

export const tokenRecordSchema = z.object({
  artifactId: z.string(),
  kind: z.enum(TOKEN_KINDS),
});

export type TokenRecord = z.infer<typeof tokenRecordSchema>;

export type PutTokenResult = { ok: true } | { ok: false; cause: unknown };

export async function putAccessToken(
  kv: KVNamespace,
  token: string,
  record: TokenRecord,
): Promise<PutTokenResult> {
  try {
    await kv.put(accessTokenKey(token), JSON.stringify(record));
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
