"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { type Role } from "@/generated/prisma";
import { validatePassword } from "@/lib/passwordPolicy";
import { writeAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// ── Select shape shared between create/update responses ──────────────────────
const USER_SELECT = {
  id: true, name: true, email: true, phone: true, role: true,
  customRole: true, customRoleId: true,
  isActive: true, createdAt: true,
  bankAccountNo: true, bankName: true, ifscCode: true,
  aadhaarNo: true, panNo: true, photoBase64: true,
  salaryProfile: {
    select: {
      monthlySalary: true,
      effectiveFrom: true,
      notes: true,
    }
  }
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
  const role         = str(formData, "role") as Role;
  const customRole   = optStr(formData, "customRole");
  const customRoleId = optStr(formData, "customRoleId");
  const password     = str(formData, "password");

  // Extended profile
  const bankAccountNo = optStr(formData, "bankAccountNo");
  const bankName      = optStr(formData, "bankName");
  const ifscCode      = optStr(formData, "ifscCode");
  const aadhaarNo     = optStr(formData, "aadhaarNo");
  const panNo         = optStr(formData, "panNo");
  const photoBase64   = optStr(formData, "photoBase64");

  // Salary profile
  const monthlySalaryVal = formData.get("monthlySalary") ? Number(formData.get("monthlySalary")) : null;
  const effectiveFrom = optStr(formData, "effectiveFrom");
  const salaryNotes   = optStr(formData, "salaryNotes");

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

  if (monthlySalaryVal !== null && monthlySalaryVal <= 0) return { error: "Salary must be a positive number" };
  if (monthlySalaryVal !== null && !effectiveFrom) return { error: "Salary effective date is required when salary is set" };

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Email already registered" };

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name, email, phone, role, password: hashed,
      customRole,
      customRoleId,
      agencyId: session.agencyId,
      bankAccountNo,
      bankName,
      ifscCode: ifscCode ? ifscCode.toUpperCase() : null,
      aadhaarNo,
      panNo: panNo ? panNo.toUpperCase() : null,
      photoBase64,
      salaryProfile: monthlySalaryVal !== null && effectiveFrom ? {
        create: {
          monthlySalary: monthlySalaryVal,
          effectiveFrom: new Date(effectiveFrom),
          notes: salaryNotes,
          agencyId: session.agencyId,
        }
      } : undefined,
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
  const customRole   = optStr(formData, "customRole");
  const customRoleId = optStr(formData, "customRoleId");
  const newPassword = str(formData, "password");

  // Extended profile
  const bankAccountNo = optStr(formData, "bankAccountNo");
  const bankName      = optStr(formData, "bankName");
  const ifscCode      = optStr(formData, "ifscCode");
  const aadhaarNo     = optStr(formData, "aadhaarNo");
  const panNo         = optStr(formData, "panNo");
  const photoBase64   = optStr(formData, "photoBase64");

  // Salary profile
  const monthlySalaryVal = formData.get("monthlySalary") ? Number(formData.get("monthlySalary")) : null;
  const effectiveFrom = optStr(formData, "effectiveFrom");
  const salaryNotes   = optStr(formData, "salaryNotes");

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

  if (monthlySalaryVal !== null && monthlySalaryVal <= 0) return { error: "Salary must be a positive number" };
  if (monthlySalaryVal !== null && !effectiveFrom) return { error: "Salary effective date is required when salary is set" };

  const existing = await prisma.user.findFirst({ where: { id, agencyId: session.agencyId } });
  if (!existing) return { error: "Employee not found" };

  if (email !== existing.email) {
    const conflict = await prisma.user.findUnique({ where: { email } });
    if (conflict) return { error: "Email already in use by another account" };
  }

  const data: Record<string, any> = {
    name, email, phone, role,
    customRole,
    customRoleId,
    bankAccountNo,
    bankName,
    ifscCode: ifscCode ? ifscCode.toUpperCase() : null,
    aadhaarNo,
    panNo: panNo ? panNo.toUpperCase() : null,
    photoBase64,
  };
  if (newPassword) {
    data.password = await bcrypt.hash(newPassword, 12);
    data.passwordChangedAt = new Date(); // invalidates old sessions
  }

  // Track whether salary should be cleared (cannot use nested deleteMany on one-to-one)
  const clearSalary = !monthlySalaryVal && formData.get("monthlySalary") === "";

  if (monthlySalaryVal !== null && effectiveFrom) {
    data.salaryProfile = {
      upsert: {
        create: {
          monthlySalary: monthlySalaryVal,
          effectiveFrom: new Date(effectiveFrom),
          notes: salaryNotes,
          agencyId: session.agencyId,
        },
        update: {
          monthlySalary: monthlySalaryVal,
          effectiveFrom: new Date(effectiveFrom),
          notes: salaryNotes,
        }
      }
    };
  }
  // Note: we do NOT set salaryProfile: { delete } here — one-to-one nested delete
  // throws if no record exists. Instead we run a separate deleteMany below.

  const user = await prisma.user.update({
    where: { id },
    data,
    select: USER_SELECT,
  });

  // Safely clear salary profile when monthlySalary is blank —
  // deleteMany on the model itself is always safe (no-op when record doesn't exist)
  if (clearSalary) {
    await prisma.employeeSalaryProfile.deleteMany({ where: { employeeId: id } });
  }

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

export async function getCustomRoles() {
  const session = await getSession();
  if (!session || !session.agencyId) return { error: "Unauthorized" };

  try {
    const customRoles = await prisma.customRole.findMany({
      where: { agencyId: session.agencyId },
      orderBy: { name: "asc" },
    });
    return { customRoles };
  } catch (error) {
    console.error("[getCustomRoles] Error:", error);
    return { error: "Failed to fetch custom roles" };
  }
}

export async function createCustomRole(name: string, baseRole: Role) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Role name cannot be empty" };

  try {
    const customRole = await prisma.customRole.create({
      data: {
        name: trimmedName,
        baseRole,
        agencyId: session.agencyId,
      },
    });
    return { customRole };
  } catch (error: any) {
    console.error("[createCustomRole] Error:", error);
    if (error.code === "P2002") {
      return { error: "A role with this name already exists in your agency" };
    }
    return { error: "Failed to create custom role" };
  }
}

export async function deleteCustomRole(customRoleId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) return { error: "Unauthorized" };

  try {
    await prisma.$transaction([
      // Reset users assigned to this custom role back to their base role
      prisma.user.updateMany({
        where: { customRoleId, agencyId: session.agencyId },
        data: { customRole: null, customRoleId: null },
      }),
      // Remove all permission overrides for this custom role
      prisma.rolePermission.deleteMany({
        where: { agencyId: session.agencyId, role: customRoleId },
      }),
      // Delete the custom role itself
      prisma.customRole.delete({
        where: { id: customRoleId, agencyId: session.agencyId },
      }),
    ]);

    revalidatePath("/admin/staff-management");
    revalidatePath("/admin/security");
    return { success: true };
  } catch (error) {
    console.error("[deleteCustomRole] Error:", error);
    return { error: "Failed to delete custom role" };
  }
}
