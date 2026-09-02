import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";

beforeAll(() => {
  // A fixed, valid 32-byte key for this test run only — never the real
  // production key. Set before importing the module under test so
  // getKey() succeeds.
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("token encryption", () => {
  it("round-trips a plaintext token through encrypt/decrypt", async () => {
    const { encryptSecret, decryptSecret } = await import("./token-encryption");
    const plaintext = "ya29.a0AfH6SMB_fake_access_token_value";
    const encrypted = encryptSecret(plaintext);
    expect(encrypted.ciphertext).not.toContain(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV) even for the same plaintext", async () => {
    const { encryptSecret } = await import("./token-encryption");
    const a = encryptSecret("same-token");
    const b = encryptSecret("same-token");
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it("fails closed if the ciphertext was tampered with (GCM auth tag check)", async () => {
    const { encryptSecret, decryptSecret } = await import("./token-encryption");
    const encrypted = encryptSecret("a-real-looking-token");
    const tampered = { ...encrypted, ciphertext: Buffer.from(encrypted.ciphertext, "base64").reverse().toString("base64") };
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("isTokenEncryptionConfigured reports false for a missing or malformed key", async () => {
    const original = process.env.TOKEN_ENCRYPTION_KEY;
    const { isTokenEncryptionConfigured } = await import("./token-encryption");

    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(isTokenEncryptionConfigured()).toBe(false);

    process.env.TOKEN_ENCRYPTION_KEY = "too-short";
    expect(isTokenEncryptionConfigured()).toBe(false);

    process.env.TOKEN_ENCRYPTION_KEY = original;
  });
});
