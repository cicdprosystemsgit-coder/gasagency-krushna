import { z } from "zod";

export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character (e.g. @, #, !)");

export type PasswordValidation = { valid: true } | { valid: false; message: string };

export function validatePassword(password: string): PasswordValidation {
  const result = PasswordSchema.safeParse(password);
  if (!result.success) {
    return { valid: false, message: result.error.issues[0]?.message ?? "Invalid password" };
  }
  return { valid: true };
}
