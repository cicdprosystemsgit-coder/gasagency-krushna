import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY_HEX = process.env.ENCRYPTION_KEY;
if (!KEY_HEX || KEY_HEX.length !== 64) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: openssl rand -hex 32");
  }
  // Dev warning — non-blocking
  console.warn("[encryption] ENCRYPTION_KEY not set — sensitive fields will NOT be encrypted in dev mode");
}

const KEY = KEY_HEX ? Buffer.from(KEY_HEX, "hex") : Buffer.alloc(32);

const SEPARATOR = ":";

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns format: `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(SEPARATOR);
}

/**
 * Decrypts a value produced by `encrypt()`.
 * Returns the original plaintext or throws on tamper.
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(SEPARATOR);
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const [ivHex, tagHex, encHex] = parts;
  const iv        = Buffer.from(ivHex,  "hex");
  const tag       = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher  = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}

/**
 * Encrypts a nullable field value.
 * Already-encrypted values (containing the separator) are returned as-is.
 */
export function encryptField(value: string | null | undefined): string | null {
  if (!value) return null;
  // Detect already-encrypted (contains 2 separators = 3 parts)
  if (value.split(SEPARATOR).length === 3) return value;
  return encrypt(value);
}

/**
 * Decrypts a nullable field value.
 * Plain-text values (not matching encrypted format) are returned as-is.
 */
export function decryptField(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch {
    // Not encrypted — return raw (handles migration period)
    return value;
  }
}
