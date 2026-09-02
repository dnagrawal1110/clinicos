import "server-only";

// Server-only OAuth token encryption (Part 2/24). AES-256-GCM with a key
// from TOKEN_ENCRYPTION_KEY — never checked into source, never sent to the
// browser. Ciphertext and IV are stored separately in Postgres
// (connections.access_token_ciphertext / access_token_iv); the plaintext
// token exists in memory only for the duration of the request that needs
// it (an OAuth callback, or a sync job about to call the provider API).
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and add it to " +
      ".env.local (server-only, never NEXT_PUBLIC_) before any OAuth token can be stored."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (got ${key.length}). Generate with: openssl rand -base64 32`);
  }
  return key;
}

export interface EncryptedSecret {
  ciphertext: string; // base64: authTag(16 bytes) + actual ciphertext
  iv: string; // base64
}

export function encryptSecret(plaintext: string): EncryptedSecret {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV, standard for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([authTag, encrypted]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decryptSecret(encrypted: EncryptedSecret): string {
  const key = getKey();
  const iv = Buffer.from(encrypted.iv, "base64");
  const combined = Buffer.from(encrypted.ciphertext, "base64");
  const authTag = combined.subarray(0, 16);
  const ciphertext = combined.subarray(16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function isTokenEncryptionConfigured(): boolean {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) return false;
  try {
    return Buffer.from(raw, "base64").length === 32;
  } catch {
    return false;
  }
}
