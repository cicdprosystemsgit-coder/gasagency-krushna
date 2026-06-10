/**
 * TOTP helpers for 2FA — uses the `otpauth` library (RFC 6238 compliant).
 * Compatible with Google Authenticator, Authy, and any TOTP app.
 */
import * as OTPAuth from "otpauth";

const ISSUER = "GasAgency";

/** Generate a new TOTP secret and return it in base32 + the otpauth:// URI */
export function generateTOTPSecret(accountName: string): {
  secret: string;
  uri: string;
} {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: accountName,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

/** Verify a 6-digit TOTP code against the stored base32 secret */
export function verifyTOTP(secret: string, token: string): boolean {
  if (!secret || !token || token.length !== 6) return false;

  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // Allow ±1 window (30s tolerance for clock drift)
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

/** Generate a set of 8 one-time backup codes */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    const code = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
      .slice(0, 8);
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/** SHA-256 hash a backup code for safe DB storage */
export async function hashBackupCode(code: string): Promise<string> {
  const normalized = code.replace(/-/g, "").toUpperCase();
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Check a raw backup code against an array of stored hashes; returns matching hash or null */
export async function checkBackupCode(raw: string, hashes: string[]): Promise<string | null> {
  const h = await hashBackupCode(raw);
  return hashes.includes(h) ? h : null;
}
