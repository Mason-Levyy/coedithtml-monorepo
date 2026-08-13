const ALGORITHM = "pbkdf2";
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_BITS,
  );
  return toHex(new Uint8Array(bits));
}

function equalsInConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

export async function hashArtifactPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derive(password, salt, ITERATIONS);
  return `${ALGORITHM}$${ITERATIONS}$${toHex(salt)}$${derived}`;
}

export async function verifyArtifactPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algorithm, iterations, saltHex, expected] = stored.split("$");
  if (
    algorithm !== ALGORITHM ||
    saltHex === undefined ||
    expected === undefined
  ) {
    return false;
  }
  const rounds = Number(iterations);
  if (!Number.isInteger(rounds) || rounds < 1) {
    return false;
  }
  const salt = fromHex(saltHex);
  if (salt === null) {
    return false;
  }
  return equalsInConstantTime(await derive(password, salt, rounds), expected);
}
