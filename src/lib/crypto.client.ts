/**
 * Converts a base64 string to an ArrayBuffer.
 * @param base64 The base64 string.
 * @returns The corresponding ArrayBuffer.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Imports a raw key from a base64 string for use with the Web Crypto API.
 * @param keyB64 The base64 encoded key.
 * @returns A promise that resolves to a CryptoKey.
 */
export async function importKey(keyB64: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyB64);

  return window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-GCM" },
    true, // is extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a data chunk using AES-GCM.
 * @param data The data to encrypt (ArrayBuffer).
 * @param key The CryptoKey to use for encryption.
 * @returns A promise that resolves to an object containing the encrypted data (ArrayBuffer) and the initialization vector (IV) as a base64 string.
 */
export async function encryptChunk(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<{ encryptedData: ArrayBuffer; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for GCM
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );

  const ivB64 = btoa(String.fromCharCode.apply(null, Array.from(iv)));

  return { encryptedData, iv: ivB64 };
}

/**
 * Decrypts a data chunk using AES-GCM.
 * @param encryptedData The encrypted data (ArrayBuffer).
 * @param key The CryptoKey to use for decryption.
 * @param ivB64 The base64 encoded initialization vector.
 * @returns A promise that resolves to the decrypted data (ArrayBuffer).
 */
export async function decryptChunk(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  ivB64: string
): Promise<ArrayBuffer> {
  const iv = base64ToArrayBuffer(ivB64);

  return window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encryptedData
  );
}
