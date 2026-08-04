import { unlockGrantAllows } from "./unlock-grants";

export type PasswordGateResult =
  | { ok: true }
  | { ok: false; status: 401 }
  | { ok: false; status: 500; cause: unknown };

// Reads a grant minted by the unlock route, never a password. A password in a
// URL lands in browser history and in every access log it passes through, and
// on the sandbox origin the artifact's own scripts can read it back off
// location.search and send it anywhere.
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
