"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { type Role } from "@/generated/prisma";
import { validatePassword } from "@/lib/passwordPolicy";
import { encryptField, decryptField } from "@/lib/encryption";
import { writeAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

// ── Select shape shared between create/update responses ──────────────────────
const USER_SELECT = {
  id: true, name: true, email: true, phone: true, role: true,
  isActive: true, createdAt: true,
  bankAccountNo: true, bankName: true, ifscCode: true,
  aadhaarNo: true, panNo: true, photoBase64: true,
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function str(fd: FormData, key: string): string {
  return ((fd.get(key) as string) ?? "").trim();
}
function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v || null;
}

export async function createStaffUser(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  const name     = str(formData, "name");
  const email    = str(formData, "email").toLowerCase();
  const phone    = optStr(formData, "phone");
  const role     = str(formData, "role") as Role;
  const password = str(formData, "password");

  // Extended profile
  const bankAccountNo = optStr(formData, "bankAccountNo");
  const bankName      = optStr(formData, "bankName");
  const ifscCode      = optStr(formData, "ifscCode");
  const aadhaarNo     = optStr(formData, "aadhaarNo");
  const panNo         = optStr(formData, "panNo");
  const photoBase64   = optStr(formData, "photoBase64");

  // Validations
  if (!name || !/^[a-zA-Z\s]+$/.test(name))  return { error: "Valid name required (alphabets only)" };
  if (!email || !email.includes("@"))          return { error: "Valid email required" };
  if (phone && !/^\d{10}$/.test(phone))        return { error: "Phone must be 10 digits" };
  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) return { error: pwCheck.message };
  if (bankAccountNo && !/^\d{9,18}$/.test(bankAccountNo)) return { error: "Bank account must be 9–18 digits" };
  if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) return { error: "Invalid IFSC code (e.g. SBIN0001234)" };
  if (aadhaarNo && !/^\d{12}$/.test(aadhaarNo))           return { error: "Aadhaar must be exactly 12 digits" };
  if (panNo && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNo.toUpperCase())) return { error: "Invalid PAN format (e.g. ABCDE1234F)" };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Email already registered" };

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name, email, phone, role, password: hashed,
      agencyId: session.agencyId,
      bankAccountNo: encryptField(bankAccountNo),
      bankName,
      ifscCode: ifscCode ? ifscCode.toUpperCase() : null,
      aadhaarNo: encryptField(aadhaarNo),
      panNo: panNo ? encryptField(panNo.toUpperCase()) : null,
      photoBase64,
    },
    select: USER_SELECT,
  });
  return { user };
}

export async function updateStaffUser(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  const id          = str(formData, "id");
  const name        = str(formData, "name");
  const email       = str(formData, "email").toLowerCase();
  const phone       = optStr(formData, "phone");
  const role        = str(formData, "role") as Role;
  const newPassword = str(formData, "password");

  // Extended profile
  const bankAccountNo = optStr(formData, "bankAccountNo");
  const bankName      = optStr(formData, "bankName");
  const ifscCode      = optStr(formData, "ifscCode");
  const aadhaarNo     = optStr(formData, "aadhaarNo");
  const panNo         = optStr(formData, "panNo");
  const photoBase64   = optStr(formData, "photoBase64");

  if (!id)                                      return { error: "Employee ID missing" };
  if (!name || !/^[a-zA-Z\s]+$/.test(name))    return { error: "Valid name required (alphabets only)" };
  if (!email || !email.includes("@"))            return { error: "Valid email required" };
  if (phone && !/^\d{10}$/.test(phone))          return { error: "Phone must be 10 digits" };
  if (newPassword) {
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) return { error: pwCheck.message };
  }
  if (bankAccountNo && !/^\d{9,18}$/.test(bankAccountNo)) return { error: "Bank account must be 9–18 digits" };
  if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) return { error: "Invalid IFSC code" };
  if (aadhaarNo && !/^\d{12}$/.test(aadhaarNo))           return { error: "Aadhaar must be exactly 12 digits" };
  if (panNo && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNo.toUpperCase())) return { error: "Invalid PAN format" };

  const existing = await prisma.user.findFirst({ where: { id, agencyId: session.agencyId } });
  if (!existing) return { error: "Employee not found" };

  if (email !== existing.email) {
    const conflict = await prisma.user.findUnique({ where: { email } });
    if (conflict) return { error: "Email already in use by another account" };
  }

  const data: Record<string, unknown> = {
    name, email, phone, role,
    bankAccountNo: encryptField(bankAccountNo),
    bankName,
    ifscCode: ifscCode ? ifscCode.toUpperCase() : null,
    aadhaarNo: encryptField(aadhaarNo),
    panNo: panNo ? encryptField(panNo.toUpperCase()) : null,
    photoBase64,
  };
  if (newPassword) {
    data.password = await bcrypt.hash(newPassword, 12);
    data.passwordChangedAt = new Date(); // invalidates old sessions
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: USER_SELECT,
  });

  await writeAuditLog({
    userId: session.userId, agencyId: session.agencyId,
    action: AUDIT_ACTIONS.UPDATE_STAFF, entityType: "User", entityId: id,
    after: { name, email, role, passwordChanged: !!newPassword },
  });

  return { user };
}

export async function deleteStaffUser(id: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId)
    return { success: false, error: "Unauthorized" };

  const user = await prisma.user.findFirst({ where: { id, agencyId: session.agencyId } });
  if (!user)              return { success: false, error: "Employee not found" };
  if (user.role === "ADMIN") return { success: false, error: "Cannot delete an admin account" };

  try {
    await prisma.user.delete({ where: { id } });
    await writeAuditLog({
      userId: session.userId, agencyId: session.agencyId,
      action: AUDIT_ACTIONS.DELETE_STAFF, entityType: "User", entityId: id,
      before: { name: user.name, email: user.email, role: user.role },
    });
    return { success: true };
  } catch {
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    return { success: true, softDeleted: true };
  }
}

export async function toggleStaffStatus(id: string, isActive: boolean) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { success: false };
  await prisma.user.update({ where: { id, agencyId: session.agencyId }, data: { isActive } });
  return { success: true };
}
