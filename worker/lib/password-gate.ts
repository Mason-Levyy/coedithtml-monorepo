import { unlockGrantAllows } from "./unlock-grants";

export type PasswordGateResult =
  | { ok: true }
  | { ok: false; status: 401 }
  | { ok: false; status: 500; cause: unknown };

export async function checkPasswordGate(
  kv: KVNamespace,
  options: {
    artifactId: string;
    passwordHash: string | undefined;
    grant: string | null;
  },
): Promise<PasswordGateResult> {
  if (options.passwordHash === undefined) {
    return { ok: true };
  }

  const allowed = await unlockGrantAllows(
    kv,
    options.grant,
    options.artifactId,
  );
  if (!allowed.ok) {
    return { ok: false, status: 500, cause: allowed.cause };
  }
  return allowed.valid ? { ok: true } : { ok: false, status: 401 };
}
