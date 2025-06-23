import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const MASTER_KEY = Buffer.from(process.env.MASTER_KEY!, "hex");

if (MASTER_KEY.length !== 32) {
  throw new Error("MASTER_KEY must be a 32-byte hex string.");
}

/**
 * Encrypts a plaintext key using the master key.
 * @param plaintextKey The key to encrypt (Buffer).
 * @returns The encrypted key data as a base64 string.
 */
export function encryptUploadKey(plaintextKey: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintextKey),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Prepend IV and AuthTag to the encrypted data for storage
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Decrypts an encrypted key using the master key.
 * @param encryptedKeyB64 The base64 encrypted key data.
 * @returns The decrypted key as a Buffer.
 */
export function decryptUploadKey(encryptedKeyB64: string): Buffer {
  const data = Buffer.from(encryptedKeyB64, "base64");

  // Extract IV, AuthTag, and encrypted data
  const iv = data.slice(0, 12);
  const authTag = data.slice(12, 28);
  const encrypted = data.slice(28);

  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted;
}
