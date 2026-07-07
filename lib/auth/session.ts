const COOKIE_NAME = "fc_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 Tage

async function getSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) return null;
    bytes[i] = byte;
  }
  return bytes;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(secret: string): Promise<string> {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(String(expiresAt)) as BufferSource
  );
  return `${expiresAt}.${bytesToHex(signature)}`;
}

export async function isValidSessionToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const separatorIndex = token.indexOf(".");
  if (separatorIndex === -1) return false;

  const expiresAtRaw = token.slice(0, separatorIndex);
  const signatureHex = token.slice(separatorIndex + 1);
  if (!/^\d+$/.test(expiresAtRaw)) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Date.now()) return false;

  const signatureBytes = hexToBytes(signatureHex);
  if (!signatureBytes) return false;

  const key = await getSigningKey(secret);
  // crypto.subtle.verify vergleicht intern konstant-zeitig - kein manuelles
  // String-Vergleichen von Signaturen (Timing-Angriffe vermeiden).
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes as BufferSource,
    new TextEncoder().encode(expiresAtRaw) as BufferSource
  );
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE_SECONDS = MAX_AGE_SECONDS;
